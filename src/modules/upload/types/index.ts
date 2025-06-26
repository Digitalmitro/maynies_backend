import { Types } from "mongoose";


export interface IUploadedFile extends Document {
    file_url: string;
    type: string; // image/png, application/pdf etc.
    size: number; // in bytes
    original_name: string;
    uploaded_at: Date;
    context: string; // e.g. "employer_document", "student_resume"
    owner_id: Types.ObjectId;
    uploaded_by_role: 'student' | 'employer' | 'admin' | null; // who uploaded it
    is_deleted: boolean; // soft delete flag
    metadata?: {
        name?: string; // e.g. "Aadhar Card"
        [key: string]: any;
    };
}