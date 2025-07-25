import mongoose, { Schema } from "mongoose";
import { ApprovalStep } from "../types";

export interface FormSubmission extends Document {
    employeeId: string;
    formTemplateId: Schema.Types.ObjectId;
    status: "Draft" | "Pending" | "Approved" | "Rejected" | "NeedsRevision";
    data: Record<string, any>;    // Dynamic payload from fields
    approvals: ApprovalStep[];
    attachments?: {
        name: string;
        url: string;
        uploadedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

const approvalStepSchema = new Schema<ApprovalStep>({
    role: { type: String, required: true },
    approverId: { type: String, required: true },
    action: {
        type: String,
        enum: ["Pending", "Approved", "Rejected", "NeedsRevision"],
        default: "Pending"
    },
    date: Date,
    comment: String
});

const formSubmissionSchema = new Schema<FormSubmission>({
    employeeId: { type: String, required: true },
    formTemplateId: {
        type: Schema.Types.ObjectId,
        ref: "FormTemplate", // 👈 IMPORTANT for populate to work
        required: true
    },
    status: {
        type: String,
        enum: ["Draft", "Pending", "Approved", "Rejected", "NeedsRevision"],
        default: "Draft"
    },
    data: { type: Schema.Types.Mixed, required: true }, // Flexible for dynamic fields
    approvals: { type: [approvalStepSchema], default: [] },
    attachments: [
        {
            name: String,
            url: String,
            uploadedAt: { type: Date, default: Date.now }
        }
    ],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

export default mongoose.model<FormSubmission>(
    "FormSubmission",
    formSubmissionSchema
);
