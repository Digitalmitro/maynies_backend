import { Schema } from "mongoose";

export interface DocumentType {
    name: string;
    file_url: string;
    uploaded_at: Date;
    type?: string;
}

export interface EmployeeProfileType {
    user_id: Schema.Types.ObjectId;
    designation?: string;
    date_of_joining?: Date;
    mobile_number?: string;
    work_number?: string;
    location?: {
        country?: string;
        city?: string;
    };
    profile_picture?: string;
    documents?: Document[];
}