import { Schema, model, Types } from 'mongoose';
import { ICourseDetail } from '../types';


interface ICourseDetailDocument extends ICourseDetail, Document { }

const CourseDetailSchema = new Schema<ICourseDetailDocument>({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true, index: true },

    description: { type: String },
    tags: [{ type: String }],
    validity_days: { type: Number, default: 365 },

    rating_avg: { type: Number, default: 0 },
    rating_count: { type: Number, default: 0 },

    views: { type: Number, default: 0 },
    total_enrollments: { type: Number, default: 0 }
}, {
    timestamps: true
});

export const CourseDetailModel = model<ICourseDetailDocument>('CourseDetail', CourseDetailSchema);
