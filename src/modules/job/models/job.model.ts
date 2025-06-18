import { Schema, model, Types, Document } from 'mongoose';
import { IJob } from '../types';





export interface IJobDoc extends IJob, Document { }


const SalaryRangeSchema = new Schema(
    {
        min: { type: Number, required: true },
        max: { type: Number, required: true },
        currency: { type: String, default: 'INR' }
    },
    { _id: false }
);

const JobSchema = new Schema<IJobDoc>(
    {
        title: { type: String, required: true },
        short_description: { type: String, required: true },
        description: { type: String, required: true },
        location: { type: String, required: true },
        job_type: {
            type: String,
            enum: ['full-time', 'part-time', 'internship'],
            required: true
        },
        slug: { type: String, unique: true, index: true },
        experience: { type: String },
        posted_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        expires_at: { type: Date, required: true },
        is_active: { type: Boolean, default: true },
        requirements: [{ type: String }],
        openings: { type: Number },
        application_instructions: { type: String },
        attachment_url: { type: String },
        salary_range: { type: SalaryRangeSchema }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export const JobModel = model<IJobDoc>('Job', JobSchema);
