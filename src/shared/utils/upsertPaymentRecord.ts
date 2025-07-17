import Stripe from "stripe";


import { CoursePaymentModel } from "../../modules/courses/models/coursePayment.model";
import { CourseEnrollmentModel } from "../../modules/courses/models/courseEnrollment.model";
import { CourseCartModel } from "../../modules/courses/models/courseCart.model";
import mongoose from "mongoose";

export async function upsertPaymentAndEnrollment(
    session: Stripe.Checkout.Session | Stripe.PaymentIntent,
    options: { cleanCart?: boolean } = { cleanCart: true }
) {
    const metadata = (session as any).metadata || {};
    const student_id = metadata.student_id;
    const course_id = metadata.course_id;
    const amount_paid = (session as any).amount_total
        ? (session as any).amount_total / 100
        : (session as any).amount_received / 100;
    const currency = (session as any).currency || 'INR';

    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try {
        // Check if payment already exists
        const existingPayment = await CoursePaymentModel.findOne({
            $or: [
                { stripe_session_id: (session as any).id },
                { stripe_payment_intent_id: (session as any).payment_intent || (session as any).id }
            ]
        }).session(dbSession);

        if (existingPayment) {
            console.log(`ℹ️ Payment already exists: ${existingPayment._id}`);
        } else {
            await CoursePaymentModel.create([{
                student_id,
                course_id,
                amount_paid,
                currency,
                stripe_session_id: (session as any).id,
                stripe_payment_intent_id: (session as any).payment_intent || (session as any).id,
                stripe_customer_id: (session as any).customer || '',
                receipt_url: (session as any).receipt_url || '',
                status: 'succeeded',
                paid_at: new Date(),
            }], { session: dbSession });
        }

        // Upsert Enrollment
        await CourseEnrollmentModel.findOneAndUpdate(
            { student_id, course_id },
            {
                student_id,
                course_id,
                amount_paid,
                payment_status: 'paid',
                access_granted: true,
                access_notes: `Granted via Stripe at ${new Date().toISOString()}`
            },
            { upsert: true, new: true, session: dbSession }
        );

        if (options.cleanCart) {
            await CourseCartModel.deleteOne({ student_id, course_id }).session(dbSession);
        }

        await dbSession.commitTransaction();
        console.log(`✅ [DB] Payment & Enrollment upserted for ${student_id}`);
    } catch (err) {
        await dbSession.abortTransaction();
        console.error('❌ [DB] Transaction failed:', err);
        throw err;
    } finally {
        dbSession.endSession();
    }
}


