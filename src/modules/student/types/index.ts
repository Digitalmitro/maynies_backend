import { Schema } from "mongoose";

export type IAdmissionDocument = {
    admission_id: Schema.Types.ObjectId;
    name: string;
    file_url: string;
    type?: string;
    uploaded_at: Date;
}

export type IAdmission = {
    user_id?: Schema.Types.ObjectId;
    personal: {
        first_name: string;
        last_name: string;
        dob: Date;
        gender: 'male' | 'female' | 'other';
        email: string;
        mobile: string;
    };
    address: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    academic: {
        institute: string;
        qualification: string;
        grade: string;
        passing_year: number;
    };
    guardian: {
        name: string;
        contact: string;
        relation: string;
    };
    status: 'pending' | 'approved' | 'rejected';
    submitted_at: Date;
    reviewed_at?: Date;
}