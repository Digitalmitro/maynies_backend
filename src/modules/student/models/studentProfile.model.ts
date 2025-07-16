// src/modules/student/models/studentProfile.model.ts

import { Schema, model, Document, Types } from 'mongoose';

export interface IStudentProfile extends Document {
    user_id: Schema.Types.ObjectId;
    is_active: boolean;
    admission_id?: Types.ObjectId;
    resume_id?: Types.ObjectId;
    contact_number?: string;
    date_of_birth?: Date;
    mothers_name?: string;
    race?: string;
    address?: {
        street?: string;
        country?: string;
        city?: string;
        state?: string;
        zip?: string;
    };
    // add any other fields you’ll want to update later
}

const StudentProfileSchema = new Schema<IStudentProfile>(
    {
        user_id: {
            type: Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },

        is_active: {
            type: Boolean,
            default: true,   // student becomes active immediately
        },

        admission_id: {
            type: Types.ObjectId,
            ref: 'Admission',
            required: false,
            index: true,
        },

        resume_id: {
            type: Types.ObjectId,
            ref: 'UploadedFile',
            required: false,
            index: true,
        },
        mothers_name: { type: String, trim: true, required: false },

        race: { type: String, trim: true, required: false },
        contact_number: { type: String, required: false },
        date_of_birth: { type: Date, required: false },
        address: {
            street: { type: String, required: false },
            city: { type: String, required: false },
            country: { type: String, required: false },
            state: { type: String, required: false },
            zip: { type: String, required: false },
        },
        // any additional profile fields go here…
    },

    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
        autoIndex: process.env.NODE_ENV !== 'production',
    }
);

// compound index for quick lookups if needed
StudentProfileSchema.index({ user_id: 1, is_active: 1 });

export const StudentProfileModel = model<IStudentProfile>(
    'StudentProfile',
    StudentProfileSchema
);
