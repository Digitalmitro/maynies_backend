// src/modules/upload/models/uploadedFile.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { IUploadedFile } from '../types';

export enum UploadContext {
    STUDENT_RESUME = 'student_resume',
    STUDENT_DOCUMENT = 'student_document',
    STUDENT_AVATAR = 'student_avatar',

    EMPLOYER_DOCUMENT = 'employer_document',
    EMPLOYER_AVATAR = 'employer_avatar',

    ADMIN_POLICY_PDF = 'admin_policy_pdf',

    GENERAL_ATTACHMENT = 'general_attachment' // optional future
}

const UploadedFileSchema = new Schema<IUploadedFile>(
    {
        file_url: { type: String, required: true },
        type: { type: String, required: true },
        size: { type: Number, required: true },
        original_name: { type: String, required: true },
        uploaded_at: { type: Date, default: Date.now },

        context: {
            type: String,
            enum: Object.values(UploadContext),
            required: true
        },

        owner_id: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true
        },

        uploaded_by_role: {
            type: String,
            enum: ['student', 'employer', 'admin'],
            default: null
        },

        is_deleted: {
            type: Boolean,
            default: false
        },

        metadata: {
            name: { type: String, default: null }, // e.g., "Aadhar Card"
            tags: [{ type: String }],
            expires_at: { type: Date },
            admission_id: {
                type: Schema.Types.ObjectId,
                ref: 'Admission',
                required: false,
                index: true      // for fast lookup of docs by admission
            }
        }
    },
    {
        timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
    }
);

// Compound index for performance (optional but useful)
UploadedFileSchema.index({ context: 1, owner_id: 1, 'metadata.admission_id': 1, is_deleted: 1 });

export const UploadedFileModel = model<IUploadedFile>('UploadedFile', UploadedFileSchema);
