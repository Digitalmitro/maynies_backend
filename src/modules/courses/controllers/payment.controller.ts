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
            stripe_payment_intent_id: session.payment_intent,
            amount_paid: course.discount_price ?? course.price,
            currency: 'INR',
            status: 'pending' as const,
        };

        // if (session.payment_intent) {
        //     updatedData.stripe_payment_intent_id = session.payment_intent;
        // }

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

    // 1️⃣ Verify signature & construct event
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

    // 2️⃣ Acknowledge receipt ASAP
    res.status(200).json({ received: true });

    // 3️⃣ Handle relevant event types
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
        return res
            .status(400)
            .json({ success: false, message: 'No session_id provided' });
    }

    try {
        // DB-first check
        const payment = await CoursePaymentModel.findOne({
            stripe_session_id: sessionId,
        });
        if (payment?.status === 'succeeded') {
            return res.json({
                success: true,
                message: 'Payment already confirmed in database',
            });
        }

        // Fallback to Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status !== 'paid') {
            return res.json({
                success: false,
                message: 'Payment not completed yet',
            });
        }

        // Upsert by session OR payment_intent to avoid duplicate-key errors
        await CoursePaymentModel.findOneAndUpdate(
            {
                $or: [
                    { stripe_session_id: sessionId },
                    { stripe_payment_intent_id: session.payment_intent },
                ]
            },
            {
                student_id: session.metadata!.student_id,
                course_id: session.metadata!.course_id,
                stripe_session_id: session.id,
                stripe_payment_intent_id: session.payment_intent,
                amount_paid: (session.amount_total ?? 0) / 100,
                currency: session.currency,
                status: 'succeeded' as const,
                paid_at: new Date(),
                receipt_url: (session as any).receipt_url || '',
            },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: 'Payment confirmed' });
    } catch (err) {
        next(err);
    }
};



async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
    const student_id = session.metadata?.student_id!;
    const course_id = session.metadata?.course_id!;
    const amount_paid = (session.amount_total ?? 0) / 100;
    const currency = session.currency!;

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
        // Upsert Payment
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

        // Clean up Cart
        await CourseCartModel.deleteOne({ student_id, course_id }).session(dbSession);

        await dbSession.commitTransaction();
        console.log(`✅ [Webhook] checkout.session.completed processed for ${student_id}`);
    } catch (err) {
        await dbSession.abortTransaction();
        console.error('❌ [Webhook] DB transaction failed:', err);
    } finally {
        dbSession.endSession();
    }
}

// You can expand these if you need separate logic
async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
    console.log(`✅ PaymentIntent succeeded: ${pi.id}`);
    // e.g. update order status if you rely on PaymentIntent events
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
    console.warn(`⚠️ PaymentIntent failed: ${pi.id}`);
    // e.g. flag payment as failed in your DB
}