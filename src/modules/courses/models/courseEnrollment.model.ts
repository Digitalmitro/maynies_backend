import { Schema, model, Types } from 'mongoose';
import { ICourseEnrollment } from '../types';

interface ICourseEnrollmentDocument extends ICourseEnrollment, Document { }

const CourseEnrollmentSchema = new Schema<ICourseEnrollmentDocument>({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    payment_status: {
        type: String,
        enum: ['paid', 'pending', 'failed'],
        default: 'paid'
    },

    amount_paid: { type: Number, required: true },
    ordered_at: { type: Date, default: Date.now },

    access_granted: { type: Boolean, default: false },
    access_notes: { type: String },

    // soft-delete fields (optional, future-proofing)
    is_deleted: { type: Boolean, default: false },
    deleted_at: { type: Date }
}, {
    timestamps: true
});

CourseEnrollmentSchema.index({ course_id: 1, student_id: 1 }, { unique: true });

export const CourseEnrollmentModel = model<ICourseEnrollmentDocument>('CourseEnrollment', CourseEnrollmentSchema);
