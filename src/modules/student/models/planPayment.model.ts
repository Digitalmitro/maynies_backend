import { Schema, model, Document, Types } from "mongoose";

export interface PaymentDocument extends Document {
  studentId: Types.ObjectId; // NEW
  studentPlanId: Types.ObjectId;
  amount: number;
  currency?: string; // NEW - default INR
  installmentNumber?: number;
  totalInstallments?: number; // NEW
  paymentDate: Date;
  paymentMethod: "cash" | "bank_transfer" | "upi" | "stripe" | "razorpay";
  transactionId?: string;
  proofUrl?: string;
  status: "pending" | "approved" | "rejected";
  approvedAt?: Date; // NEW
  rejectedAt?: Date; // NEW
  remarks?: string;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true }, // NEW
    studentPlanId: { type: Schema.Types.ObjectId, ref: "StudentPlan", required: true },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "INR" }, // NEW
    installmentNumber: { type: Number },
    totalInstallments: { type: Number },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { 
      type: String, 
      enum: ["cash", "bank_transfer", "upi", "stripe", "razorpay"], 
      required: true,
      default: "cash"
    },
    transactionId: { type: String },
    proofUrl: { type: String },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    remarks: { type: String }
  },
  { timestamps: true }
);

paymentSchema.index({ studentId: 1, studentPlanId: 1, status: 1 });

export const Payment = model<PaymentDocument>("Payment", paymentSchema);
