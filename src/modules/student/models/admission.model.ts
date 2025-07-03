// src/modules/student/models/admission.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { IAdmission } from '../types';

export interface IAdmissionDocument extends IAdmission, Document { }

const AdmissionSchema = new Schema<IAdmissionDocument>(
    {
        user_id: {
            type: Types.ObjectId,
            ref: 'User',
            required: false,
            unique: true,   // one admission per student
            index: true,
        },
        personal: {
            first_name: { type: String, required: true },
            last_name: { type: String, required: true },
            dob: { type: Date, required: true },
            gender: { type: String, enum: ['male', 'female', 'other'], required: true },
            email: { type: String, required: true },
            mobile: { type: String, required: true },
            country: { type: String, required: true },
            marital_status: { type: String, default: null },
        },
        address: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            zip: { type: String, required: true },
        },
        academic: {
            institute: { type: String, required: true },
            qualification: { type: String, required: true },
            grade: { type: String, required: true },
            passing_year: { type: Number, required: true },
        },
        parent: {
            first_name: { type: String, required: true },
            last_name: { type: String, required: true },
            email: { type: String, required: true },
            contact: { type: String, required: true },
            address: {
                street: { type: String, required: true },
                city: { type: String, required: true },
                state: { type: String, required: true },
                zip: { type: String, required: true },
            },
        },
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending',
            index: true,
        },
        submitted_at: {
            type: Date,
            default: Date.now,
            index: -1,  // descending index
        },
        reviewed_at: { type: Date },
    },
    {
        timestamps: true,
        autoIndex: process.env.NODE_ENV !== 'production',
    }
);

// Compound index for admin queries
AdmissionSchema.index({ status: 1, submitted_at: -1 });

// Shard key for scalability
AdmissionSchema.set('shardKey', { user_id: 'hashed' });

export const AdmissionModel = model<IAdmissionDocument>('Admission', AdmissionSchema);
