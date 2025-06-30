// src/modules/payment/controllers/payment.controller.ts

import { Request, Response, NextFunction } from 'express';
import { stripe } from '../../../shared/utils/stripe';
import { CourseModel } from '../../courses/models/course.model';
import { CoursePaymentModel } from '../models/coursePayment.model';
import { CourseCartModel } from '../models/courseCart.model';
import { CourseEnrollmentModel } from '../models/courseEnrollment.model';

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
                student_id: studentId,
            },
            success_url: `${process.env.STRIPE_SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: process.env.STRIPE_CANCEL_URL,
        });

        return res.json({ url: session.url });
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
        console.error('❌ Webhook signature error:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;

        const student_id = session.metadata?.student_id;
        const course_id = session.metadata?.course_id;

        const amount_paid = session.amount_total! / 100;
        const currency = session.currency;

        try {
            // 1. Create Payment Record
            await CoursePaymentModel.create({
                student_id,
                course_id,
                amount_paid,
                currency,
                stripe_payment_intent_id: session.payment_intent,
                stripe_customer_id: session.customer,
                receipt_url: session?.receipt_url || '',
                status: 'succeeded',
            });

            // 2. Create Enrollment
            await CourseEnrollmentModel.create({
                student_id,
                course_id,
                amount_paid,
                payment_status: 'paid',
                access_granted: true,
            });

            // 3. Optional: Clean cart
            await CourseCartModel.deleteOne({ student_id, course_id });

            console.log(`✅ Payment + Enrollment success for course ${course_id}`);
        } catch (err) {
            console.error('❌ Webhook DB error:', err);
        }
    }

    res.json({ received: true });
};