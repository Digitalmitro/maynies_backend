import { Schema, model, Types } from 'mongoose';
import { ICourse } from '../types';

interface ICourseDocument extends ICourse, Document { }

const CourseSchema = new Schema<ICourseDocument>({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    thumbnail_url: { type: String },
    price: { type: Number, required: true },
    discount_price: { type: Number },
    is_free: { type: Boolean, default: false },
    credits: { type: Number, required: true, default: 0 },
    category: { type: String },
    language: { type: String },
    level: { type: String },

    instructor_name: { type: String },
    instructor_image: { type: String },

    is_active: { type: Boolean, default: true },
    is_deleted: { type: Boolean, default: false },

    created_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    published_at: { type: Date, default: Date.now }
}, { timestamps: true });



export const CourseModel = model<ICourseDocument>('Course', CourseSchema);
