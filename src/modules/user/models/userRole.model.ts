import { Schema, model, Document } from 'mongoose';
import { IRole, IUserRole } from '../../user/types';

// 1. Role
export interface IRoleDoc extends IRole, Document { }

const RoleSchema = new Schema<IRoleDoc>(
    {
        name: { type: String, required: true, unique: true, index: true },
        description: { type: String, default: null }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);
export const RoleModel = model<IRoleDoc>('Role', RoleSchema);





// 4. UserRole (mapping)
export interface IUserRoleDoc extends IUserRole, Document { }

const UserRoleSchema = new Schema<IUserRoleDoc>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
        assigned_at: { type: Date, default: Date.now }
    },
);
UserRoleSchema.index({ user_id: 1, role_id: 1 }, { unique: true });

export const UserRoleModel = model<IUserRoleDoc>('UserRole', UserRoleSchema);
