import { Schema, model } from 'mongoose';
import { ICourseCart } from '../types';



interface ICourseCartDocument extends ICourseCart, Document { }


const CourseCartSchema = new Schema<ICourseCartDocument>(
    {
        student_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
        added_at: { type: Date, default: Date.now }
    },
    {
        timestamps: true
    }
);

CourseCartSchema.index({ student_id: 1, course_id: 1 }, { unique: true });

export const CourseCartModel = model<ICourseCartDocument>('CourseCart', CourseCartSchema);
