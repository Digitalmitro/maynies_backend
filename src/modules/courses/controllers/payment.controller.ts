// src/modules/payment/controllers/payment.controller.ts

import { Request, Response, NextFunction } from 'express';
import { stripe } from '../../../shared/utils/stripe';
import { CourseModel } from '../../courses/models/course.model';
import { CoursePaymentModel } from '../models/coursePayment.model';
import { CourseCartModel } from '../models/courseCart.model';
import { CourseEnrollmentModel } from '../models/courseEnrollment.model';
import mongoose from 'mongoose';

export const createCheckoutSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { course_id } = req.body;
        const studentId = req.user?.user?._id;

        const course = await CourseModel.findById(course_id);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            customer_email: req.user?.user?.email || undefined,
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: course.title,
                            description: course.category,
                        },
                        unit_amount: Math.round((course.discount_price || course.price) * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                course_id: course._id.toString(),
                student_id: studentId!.toString(),
            },
            success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.STRIPE_CANCEL_URL,
        });

        // 3. Record initial payment in our DB as “pending”
        await CoursePaymentModel.create({
            student_id: studentId,
            course_id,
            stripe_session_id: session.id,
            // we don’t have payment_intent yet
            amount_paid: course.discount_price || course.price,
            currency: 'INR',
            status: 'pending',
        });

        // 4. Respond with session URL
        return res.status(200).json({ url: session.url, sessionId: session.id });
    } catch (err) {
        next(err);
    }
};


export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature']!;
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error('❌ Webhook signature error:', msg);
        return res.status(400).send(`Webhook Error: ${msg}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const student_id = session.metadata?.student_id;
        const course_id = session.metadata?.course_id;

        const amount_paid = (session.amount_total || 0) / 100;
        const currency = session.currency;

        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();
        try {
            // Upsert Payment (idempotent)
            await CoursePaymentModel.findOneAndUpdate(
                { stripe_payment_intent_id: session.payment_intent },
                {
                    student_id,
                    course_id,
                    amount_paid,
                    currency,
                    stripe_session_id: session.id,
                    stripe_payment_intent_id: session.payment_intent,
                    stripe_customer_id: session.customer as string,
                    receipt_url: (session as any).receipt_url || '',
                    status: 'succeeded',
                    paid_at: new Date(),
                },
                { upsert: true, new: true, session: dbSession }
            );

            // Upsert Enrollment
            await CourseEnrollmentModel.findOneAndUpdate(
                { student_id, course_id },
                {
                    student_id,
                    course_id,
                    amount_paid,
                    payment_status: 'paid',
                    access_granted: true,
                    access_notes: `Granted via webhook at ${new Date().toISOString()}`,
                },
                { upsert: true, new: true, session: dbSession }
            );

            // Remove from Cart
            await CourseCartModel.deleteOne({ student_id, course_id }).session(dbSession);

            await dbSession.commitTransaction();
            console.log(`✅ Payment + Enrollment success for student ${student_id}`);
        } catch (dbErr) {
            await dbSession.abortTransaction();
            console.error('❌ Webhook DB transaction error:', dbErr);
        } finally {
            dbSession.endSession();
        }
    }

    res.json({ received: true });
};


export const getPaymentHistory = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const studentId = req.user?.user?._id;
    if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // 1. Pagination params
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, parseInt(req.query.limit as string) || 20);

    try {
        // 2. Total count (for frontend pagination UI)
        const totalCount = await CoursePaymentModel.countDocuments({ student_id: studentId });

        // 3. Fetch paginated payments with only needed fields
        const payments = await CoursePaymentModel.find({ student_id: studentId })
            .select('amount_paid currency status paid_at receipt_url course_id')
            .populate('course_id', 'title category')
            .sort({ paid_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // 4. Map into frontend-friendly DTO
        const history = payments.map(p => ({
            courseTitle: (p.course_id as any).title,
            courseCategory: (p.course_id as any).category,
            amount: p.amount_paid,
            currency: p.currency,
            status: p.status,
            date: p.paid_at,
            receiptUrl: p.receipt_url,
        }));

        // 5. Response
        return res.json({
            data: history,
            page,
            limit,
            totalCount,
            totalPages: Math.ceil(totalCount / limit),
        });
    } catch (err) {
        // 6. Let global error handler take care of logging
        next(err);
    }
};

export const confirmSession = async (req: Request, res: Response, next: NextFunction) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) return res.status(400).json({ success: false, message: 'No session_id' });

    try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
            return res.json({ success: true, message: 'Payment confirmed' });
        } else {
            return res.json({ success: false, message: 'Payment not completed' });
        }
    } catch (err) {
        next(err);
    }
};