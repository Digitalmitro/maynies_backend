import { Schema, model, Document } from 'mongoose';
import { IUserProfile } from '../../user/types';

export interface IUserProfileDoc extends IUserProfile, Document { }

const UserProfileSchema = new Schema<IUserProfileDoc>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true
        },
        first_name: { type: String, required: false },
        last_name: { type: String, required: false },
        avatar_url: { type: String, default: null },
        bio: { type: String, default: null }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: 'updated_at'
        }
    }
);

export const UserProfileModel = model<IUserProfileDoc>('UserProfile', UserProfileSchema);
