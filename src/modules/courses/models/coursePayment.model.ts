import { Schema, model } from 'mongoose';
import { ICoursePayment } from '../types';


interface ICoursePaymentDocument extends ICoursePayment, Document { }


const CoursePaymentSchema = new Schema<ICoursePaymentDocument>(
    {
        student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },

        stripe_session_id: { type: String, index: true },
        stripe_payment_intent_id: { type: String, unique: true, sparse: true },
        stripe_customer_id: { type: String },

        amount_paid: { type: Number, required: true },
        currency: { type: String, default: 'INR' },

        status: {
            type: String,
            enum: ['pending', 'succeeded', 'failed', 'refunded'],  // add 'pending' first
            default: 'pending'
        },

        receipt_url: { type: String },
        paid_at: { type: Date, default: Date.now }, // soft-delete fields
        is_deleted: { type: Boolean, default: false },
        deleted_at: { type: Date }
    },
    {
        timestamps: true
    }
);

CoursePaymentSchema.index({ stripe_payment_intent_id: 1 }, { unique: true, sparse: true });

export const CoursePaymentModel = model<ICoursePaymentDocument>('CoursePayment', CoursePaymentSchema);
