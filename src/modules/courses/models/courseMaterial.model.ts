import { Schema, model, Types } from 'mongoose';
import { ICourseMaterial } from '../types';

const CourseMaterialSchema = new Schema<ICourseMaterial>({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
    title: { type: String, required: true },

    file_url: { type: String, required: true },
    file_type: {
        type: String,
        enum: ['pdf', 'doc', 'image'],
        required: true
    },

    uploaded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploaded_at: { type: Date, default: Date.now }
}, {
    timestamps: true
});

export const CourseMaterialModel = model<ICourseMaterial>('CourseMaterial', CourseMaterialSchema);
