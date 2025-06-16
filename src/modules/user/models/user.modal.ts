import { Schema, model, Document } from 'mongoose';
import { IUser } from '../../user/types';

export interface IUserDocument extends IUser, Document { }

const UserSchema = new Schema<IUserDocument>(
    {
        email: {
            type: String,
            required: true,
            lowercase: true,
            unique: true
        },
        password_hash: {
            type: String,
            required: true
        },
        is_active: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export const UserModel = model<IUserDocument>('User', UserSchema);
