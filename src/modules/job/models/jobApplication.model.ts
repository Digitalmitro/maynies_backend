// models/jobApplication.model.ts
import { Schema, model, Types, Document } from 'mongoose';
import { IJobApplication } from '../types';

export const jobStatusEnum = [
    'none',
    'applied',
    'shortlisted',
    'interviewed',
    'hired',
    'rejected',
    'withdrawn' // ✅ ADDED
] as const;




interface IJobApplicationDocument extends IJobApplication, Document { }

const JobApplicationSchema = new Schema<IJobApplicationDocument>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        job_id: {
            type: Schema.Types.ObjectId,
            ref: 'Job',
            required: true,
            index: true
        },
        resume_url: {
            type: String,
            required: true
        },
        cover_letter: {
            type: String
        },
        status: {
            type: String,
            enum: jobStatusEnum,
            default: 'applied'
        }
    },
    {
        timestamps: {
            createdAt: 'applied_at',
            updatedAt: 'updated_at'
        }
    }
);

// 🔐 Prevent double apply
JobApplicationSchema.index({ user_id: 1, job_id: 1 }, { unique: true });

export const JobApplicationModel = model<IJobApplicationDocument>(
    'JobApplication',
    JobApplicationSchema
);
