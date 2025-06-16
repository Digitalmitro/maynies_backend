import { Schema, model, Document } from 'mongoose';
import { IAuditLog } from "../../auth/types"

interface IAuditLogDoc extends IAuditLog, Document { }

const AuditLogSchema = new Schema<IAuditLogDoc>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            default: null
        },
        action: {
            type: String,
            required: true
        },
        module: {
            type: String,
            required: true
        },
        resource_id: {
            type: String,
            default: null
        },
        before: {
            type: Schema.Types.Mixed,
            default: null
        },
        after: {
            type: Schema.Types.Mixed,
            default: null
        },
        ip_address: {
            type: String,
            default: null
        },
        user_agent: {
            type: String,
            default: null
        }
    },
    {
        timestamps: {
            createdAt: 'created_at',
            updatedAt: false   // logs usually immutable
        }
    }
);

// Optional: TTL to auto-purge very old logs (e.g. 1 year)
AuditLogSchema.index(
    { created_at: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 365 }
);

export const AuditLogModel = model<IAuditLogDoc>('AuditLog', AuditLogSchema);
