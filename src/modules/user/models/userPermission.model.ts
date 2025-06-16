import { Schema, model, Document } from 'mongoose';
import { IPermission, IRolePermission } from '../../auth/types';


// 2. Permission
interface IPermissionDoc extends IPermission, Document { }

const PermissionSchema = new Schema<IPermissionDoc>(
    {
        name: { type: String, required: true, unique: true, index: true },
        description: { type: String, default: null }
    },
    { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const PermissionModel = model<IPermissionDoc>('Permission', PermissionSchema);

// 3. RolePermission (mapping)
interface IRolePermDoc extends IRolePermission, Document { }

const RolePermissionSchema = new Schema<IRolePermDoc>(
    {
        role_id: { type: Schema.Types.ObjectId, ref: 'Role', required: true, index: true },
        permission_id: { type: Schema.Types.ObjectId, ref: 'Permission', required: true, index: true },
        assigned_at: { type: Date, default: Date.now }
    },
    { _id: false } // composite key below
);
RolePermissionSchema.index({ role_id: 1, permission_id: 1 }, { unique: true });

export const RolePermissionModel = model<IRolePermDoc>('RolePermission', RolePermissionSchema);