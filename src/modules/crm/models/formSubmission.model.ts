import mongoose, { Schema, Document } from "mongoose";

export interface ApprovalStep {
  role: string;
  approverId: mongoose.Types.ObjectId;
  action: "Pending" | "Approved" | "Rejected" | "NeedsRevision";
  date?: Date;
  comment?: string;
}

export interface FormSubmission extends Document {
  employeeId: mongoose.Types.ObjectId; // Ref to Employee/User
  formTemplateId: mongoose.Types.ObjectId; // Ref to FormTemplate
  status: "Draft" | "Pending" | "Approved" | "Rejected" | "NeedsRevision";
  data: Record<string, any>;
  approvals: ApprovalStep[];
  attachments?: {
    name: string;
    url: string;
    uploadedAt: Date;
  }[];
  isDeleted: boolean;
  deletedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const approvalStepSchema = new Schema<ApprovalStep>({
  role: { type: String, required: true },
  approverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    enum: ["Pending", "Approved", "Rejected", "NeedsRevision"],
    default: "Pending",
  },
  date: { type: Date },
  comment: { type: String },
});

const formSubmissionSchema = new Schema<FormSubmission>(
  {
    employeeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    formTemplateId: {
      type: Schema.Types.ObjectId,
      ref: "FormTemplate",
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Approved", "Rejected", "NeedsRevision"],
      default: "Draft",
    },
    data: { type: Schema.Types.Mixed, required: true },
    approvals: { type: [approvalStepSchema], default: [] },
    attachments: [
      {
        field: { type: String, required: true },
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  
  { timestamps: true } // 👈 auto-manage createdAt & updatedAt
);

export default mongoose.model<FormSubmission>(
  "FormSubmission",
  formSubmissionSchema
);
