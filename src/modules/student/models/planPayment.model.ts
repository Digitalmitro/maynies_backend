import { Schema, model, Document, Types } from "mongoose";

export interface PaymentDocument extends Document {
  studentPlanId: Types.ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: "cash" | "bank_transfer" | "upi" | "stripe" | "razorpay";
  transactionId?: string;
  proofUrl?: string;
  status: "pending" | "approved" | "rejected";
  remarks?: string;
}

const paymentSchema = new Schema<PaymentDocument>(
  {
    studentPlanId: { type: Schema.Types.ObjectId, ref: "StudentPlan", required: true },
    amount: { type: Number, required: true },
    paymentDate: { type: Date, default: Date.now },
    paymentMethod: { 
      type: String, 
      enum: ["cash", "bank_transfer", "upi", "stripe", "razorpay"], 
      required: true 
    },
    transactionId: String,
    proofUrl: String,
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    remarks: String
  },
  { timestamps: true }
);

export const Payment = model<PaymentDocument>("Payment", paymentSchema);
