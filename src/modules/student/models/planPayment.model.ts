import { Schema, model, Document, Types } from "mongoose";

interface PaymentInstallment {
  installmentNo: number;
  amount: number;
  dueDate: Date;
  isPaid: boolean;
  status: "pending" | "requested" | "approved" | "rejected";
  paidAt?: Date | null;
}

export interface StudentPlanPaymentDocument extends Document {
  enrollmentId: Types.ObjectId;   // ref: StudentPlanEnrollment
  payments: PaymentInstallment[];
  overallStatus: "incomplete" | "completed";
}

const paymentInstallmentSchema = new Schema<PaymentInstallment>(
  {
    installmentNo: { type: Number, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    isPaid: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["pending", "requested", "approved", "rejected"],
      default: "pending"
    },
    paidAt: { type: Date, default: null }
  },
  { _id: false }
);

const studentPlanPaymentSchema = new Schema<StudentPlanPaymentDocument>(
  {
    enrollmentId: { type: Schema.Types.ObjectId, ref: "StudentPlanEnrollment", required: true },
    payments: { type: [paymentInstallmentSchema], required: true },
    overallStatus: {
      type: String,
      enum: ["incomplete", "completed"],
      default: "incomplete"
    }
  },
  { timestamps: true }
);

export const StudentPlanPayment = model<StudentPlanPaymentDocument>(
  "StudentPlanPayment",
  studentPlanPaymentSchema
);
