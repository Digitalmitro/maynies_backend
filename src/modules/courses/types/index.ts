import { Types } from 'mongoose';

export interface ICourse {
    title: string;
    slug: string;
    thumbnail_url?: string;
    price: number;
    discount_price?: number;
    is_free: boolean;

    category?: string;
    language?: string;
    level?: string;

    instructor_name?: string;
    instructor_image?: string;

    is_active: boolean;
    is_deleted: boolean;

    created_by: Types.ObjectId;
    published_at?: Date;
}


export interface ICourseDetail {
    course_id: Types.ObjectId;
    description?: string;
    tags?: string[];
    validity_days: number;

    rating_avg: number;
    rating_count: number;
    views: number;
    total_enrollments: number;
}


export interface ICourseEnrollment {
    course_id: Types.ObjectId;
    student_id: Types.ObjectId;

    payment_status: 'paid' | 'pending' | 'failed';
    amount_paid: number;
    ordered_at?: Date;

    access_granted: boolean;
    access_notes?: string;
}


export interface ICourseMaterial {
    course_id: Types.ObjectId;
    title: string;

    file_url: string;
    file_type: 'pdf' | 'doc' | 'image';

    uploaded_by: Types.ObjectId;
    uploaded_at?: Date;
}




export interface ICourseCart {
    student_id: Types.ObjectId;
    course_id: Types.ObjectId;
    added_at?: Date;
}

export interface ICoursePayment {
    student_id: Types.ObjectId;
    course_id: Types.ObjectId;
    stripe_payment_intent_id?: string;
    stripe_customer_id?: string;
    amount_paid: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'refunded';
    receipt_url?: string;
    paid_at?: Date;
}
