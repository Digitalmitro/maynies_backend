// models/RefreshToken.ts
import { Schema, model, Document } from 'mongoose';
import { IRefreshToken } from '../types';

interface IRefreshTokenDoc extends IRefreshToken, Document { }

const RefreshTokenSchema = new Schema<IRefreshTokenDoc>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true
        },
        token_hash: {
            type: String,
            required: true,
            unique: true
        },
        expires_at: {
            type: Date,
            required: true,
            index: { expires: 0 }    // TTL: auto-delete expired tokens
        },
        revoked_at: {
            type: Date,
            default: null
        },
        replaced_by: {
            type: Schema.Types.ObjectId,
            ref: 'RefreshToken',
            default: null
        },
        created_by_ip: {
            type: String,
            required: true
        },
        revoked_by_ip: {
            type: String,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: false        // no updated_at needed
        }
    }
);

export const RefreshTokenModel = model<IRefreshTokenDoc>('RefreshToken', RefreshTokenSchema);
