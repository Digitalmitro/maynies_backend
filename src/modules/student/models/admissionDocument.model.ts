// src/modules/student/models/admissionDocument.model.ts

import { Schema, model, Document, Types } from 'mongoose';
import { IAdmissionDocument } from '../types';

export interface IAdmissionDocDocument extends IAdmissionDocument, Document { }

const AdmissionDocumentSchema = new Schema<IAdmissionDocDocument>(
    {
        admission_id: {
            type: Types.ObjectId,
            ref: 'Admission',
            required: true,
            index: true,
        },
        name: { type: String, required: true },
        file_url: { type: String, required: true },
        type: { type: String, default: 'pdf' },
        uploaded_at: { type: Date, default: Date.now },
    },
    {
        _id: true,
        timestamps: false,
    }
);

// Compound index if querying by admission and type
AdmissionDocumentSchema.index({ admission_id: 1, type: 1 });

export const AdmissionDocumentModel = model<IAdmissionDocDocument>(
    'AdmissionDocument',
    AdmissionDocumentSchema
);
