import { ObjectId, Types } from 'mongoose';


export interface IJob {
    title: string;
    short_description: string;
    description: string;
    location: string;
    job_type: 'full-time' | 'part-time' | 'internship';
    experience?: string;
    posted_by: Types.ObjectId;
    expires_at: Date;
    slug?: string;
    is_active?: boolean;
    requirements?: string[];
    openings?: number;
    application_instructions?: string;
    attachment_url?: string;
    salary_range?: {
        min: number;
        max: number;
        currency: string;
    };
    created_at?: Date;
    updated_at?: Date;
}




export type ApplicationStatus =
    | 'applied'
    | 'shortlisted'
    | 'interviewed'
    | 'hired'
    | 'rejected'
    | 'withdrawn'; // ✅ ADDED

export interface IJobApplication {
    user_id: Types.ObjectId;
    job_id: Types.ObjectId;
    resume_url: string;
    cover_letter?: string;
    status: ApplicationStatus;
    applied_at?: Date;
    updated_at?: Date;
}


export interface IJobStatusHistory {
    application_id: Types.ObjectId;
    changed_by: Types.ObjectId;
    from_status: string;
    to_status: string;
    note?: string;
    reason_code?: 'SKILL_GAP' | 'CULTURE_MISMATCH' | 'DUPLICATE' | 'AUTO_REJECT'; // example set
    changed_at?: Date;
}

export type jobStatusEnumType = "none" | "applied" | "shortlisted" | "interviewed" | "hired" | "rejected" | "withdrawn"