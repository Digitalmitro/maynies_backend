import { Schema, model, Document } from 'mongoose';
import { IOtp } from '../types';

interface IOtpDocument extends IOtp, Document { }

const OtpSchema = new Schema<IOtpDocument>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        otp_hash: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['email_verification', 'password_reset'],
            required: true
        },
        expires_at: {
            type: Date,
            required: true,
            // TTL index: document auto-deletes once expires_at is reached
            index: { expires: 0 }
        },
        attempts: {
            type: Number,
            default: 0
        },
        created_by_ip: {
            type: String,
            default: null
        },
        used_at: {
            type: Date,
            default: null
        },

    },
    {
        // automatically adds created_at and updated_at
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

// (Optional) Compound index to ensure only one active OTP per user & type
OtpSchema.index(
    { user_id: 1, type: 1, used_at: 1 },
    { unique: true, partialFilterExpression: { used_at: null } }
);

export const OtpModel = model<IOtpDocument>('Otp', OtpSchema);
