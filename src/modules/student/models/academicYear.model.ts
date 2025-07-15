import { Schema, model, Document } from 'mongoose';

export interface IAcademicYear {
    name: string;                        // "2025-2026"
    pdfFileId?: Schema.Types.ObjectId;   // Ref to UploadedFile
    createdBy: Schema.Types.ObjectId;    // Admin who created
}

export interface IAcademicYearDoc extends IAcademicYear, Document { }

const AcademicYearSchema = new Schema<IAcademicYearDoc>(
    {
        name: {
            type: String,
            required: true,
            unique: true,    // Prevent duplicate years
            trim: true
        },
        pdfFileId: {
            type: Schema.Types.ObjectId,
            ref: 'UploadedFile',
            default: null    // Optional (may not have PDF yet)
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }
    },
    {
        timestamps: true // Auto createdAt & updatedAt
    }
);

export const AcademicYearModel = model<IAcademicYearDoc>(
    'AcademicYear',
    AcademicYearSchema
);
