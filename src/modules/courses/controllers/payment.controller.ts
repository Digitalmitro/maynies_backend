// src/modules/payment/controllers/payment.controller.ts

import { Request, Response, NextFunction } from 'express';
import { stripe } from '../../../shared/utils/stripe';
import { CourseModel } from '../../courses/models/course.model';
import { CoursePaymentModel } from '../models/coursePayment.model';
import { CourseCartModel } from '../models/courseCart.model';
import { CourseEnrollmentModel } from '../models/courseEnrollment.model';
import mongoose from 'mongoose';
// import stripe from 'stripe';
import Stripe from 'stripe';
import { upsertPaymentAndEnrollment } from '../../../shared/utils/upsertPaymentRecord';
export const createCheckoutSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { course_id } = req.body;
        const studentId = req.user?.user?._id!.toString();

        // 0) Existing payment record dekho
        const existing = await CoursePaymentModel.findOne({ student_id: studentId, course_id });

        if (existing) {
            // 1) Agar pehle hi succeeded hai
            if (existing.status === 'succeeded') {
                return res.status(400).json({ message: 'you already paid ' });
            }

            // 2) Agar pending hai, to Stripe pe check karo
            if (existing.status === 'pending') {
                if (!existing.stripe_session_id) {
                    return res.status(400).json({ message: 'Invalid session: missing Stripe session ID.' });
                }
                const stripeSession = await stripe.checkout.sessions.retrieve(existing.stripe_session_id);

                // 2a) Agar Stripe pe payment complete ho chuki hai
                if (stripeSession.payment_status === 'paid') {
                    // DB update karo
                    await CoursePaymentModel.updateOne(
                        { student_id: studentId, course_id },
                        { status: 'succeeded', paid_at: new Date() }
                    );
                    return res.status(400).json({ message: 'You already buy the course' });
                }

                // 2b) Agar session abhi valid hai (expire nahi hua)
                const expiresAt = new Date((stripeSession.expires_at || 0) * 1000);
                if (expiresAt > new Date()) {
                    return res.json({ url: stripeSession.url, sessionId: stripeSession.id });
                }
                // Else expired → fall through to naya session create
            }
        }

        // 3) Course exist check
        const course = await CourseModel.findById(course_id);
        if (!course) {
            return res.status(404).json({ message: 'Course nahi mila' });
        }

        // 4) Naya Stripe session banao
        //    idempotencyKey mein student-course-time daalte hain
        const idKey = `${studentId}-${course_id}-${Date.now()}`;
        const session = await stripe.checkout.sessions.create(
            {
                payment_method_types: ['card'],
                mode: 'payment',
                customer_email: req.user?.user?.email || undefined,
                line_items: [{
                    price_data: {
                        currency: 'inr',
                        product_data: { name: course.title, description: course.category },
                        unit_amount: Math.round((course.discount_price || course.price) * 100),
                    },
                    quantity: 1,
                }],
                metadata: { course_id: course._id.toString(), student_id: studentId },
                success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: process.env.STRIPE_CANCEL_URL,
            },
            { idempotencyKey: idKey }
        );
        const updatedData = {
            student_id: studentId,
            course_id,
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent || undefined,
            amount_paid: course.discount_price ?? course.price,
            currency: 'INR',
            status: 'pending' as const,
        };


        // 5) DB mein pending record upsert karo
        await CoursePaymentModel.findOneAndUpdate(
            { student_id: studentId, course_id },
            updatedData,
            { upsert: true, new: true }
        );

        // 6) Response
        return res.json({ url: session.url, sessionId: session.id });
    } catch (err) {
        next(err);
    }
};


export const stripeWebhook = async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

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

    res.status(200).json({ received: true }); // Respond early to Stripe

    switch (event.type) {
        case 'checkout.session.completed':
            await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
            break;

        case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
            break;

        case 'payment_intent.payment_failed':
            await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
            break;

        default:
            console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }
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

export const confirmSession = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const sessionId = req.query.session_id as string;
    if (!sessionId) {
        return res.status(400).json({ success: false, message: 'No session_id provided' });
    }

    try {
        // Check DB first
        const payment = await CoursePaymentModel.findOne({
            stripe_session_id: sessionId
        });

        if (payment?.status === 'succeeded') {
            return res.json({ success: true, message: 'Payment already confirmed' });
        }

        // Fallback to Stripe API
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
            return res.json({
                success: true,
                message: 'Payment succeeded but not yet synced'
            });
        }

        return res.json({
            success: false,
            message: 'Payment not completed yet'
        });
    } catch (err) {
        console.error('❌ confirmSession error:', err);
        next(err);
    }
};



async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    try {
        await upsertPaymentAndEnrollment(session, { cleanCart: true });
        console.log(`✅ [Webhook] Processed checkout.session.completed for ${session.id}`);
    } catch (err) {
        console.error('❌ [Webhook] Failed to process session:', err);
    }
}

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
    console.log(`✅ [Webhook] PaymentIntent succeeded: ${pi.id}`);
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
    console.warn(`⚠️ [Webhook] PaymentIntent failed: ${pi.id}`);
}