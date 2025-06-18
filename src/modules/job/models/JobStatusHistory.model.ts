// models/jobStatusHistory.model.ts
import { Schema, model, Document, Types } from "mongoose";
import { IJobStatusHistory } from "../types";
import { jobStatusEnum } from "./jobApplication.model"; // re-use ✅

interface IJobStatusHistoryDoc extends IJobStatusHistory, Document { }


const JobStatusHistorySchema = new Schema<IJobStatusHistoryDoc>(

    {
        application_id: {
            type: Schema.Types.ObjectId,
            ref: 'JobApplication',
            required: true
        },
        changed_by: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        from_status: {
            type: String,
            enum: jobStatusEnum,
            required: true
        },
        to_status: {
            type: String,
            enum: jobStatusEnum,
            required: true
        },
        note: {
            type: String
        },
        reason_code: {
            type: String,
            enum: ['SKILL_GAP', 'CULTURE_MISMATCH', 'DUPLICATE', 'AUTO_REJECT'], // ✅ example set
            required: false
        }
    },
    {
        timestamps: {
            createdAt: 'changed_at',
            updatedAt: false
        }
    }

);


export const JobStatusHistoryModel = model<IJobStatusHistoryDoc>(
    'JobStatusHistory',
    JobStatusHistorySchema
);
