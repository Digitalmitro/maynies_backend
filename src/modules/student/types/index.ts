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
        country: string;
        marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
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

    parent: {
        first_name: string;
        last_name: string;
        email: string;
        contact: string;
        address: {
            street: string;
            city: string;
            state: string;
            zip: string;
        };
    };

    documents?: Schema.Types.ObjectId[];  // references to UploadedFile

    status: 'pending' | 'process' | 'approved' | 'rejected';

    submitted_at: Date;
    reviewed_at?: Date;
};