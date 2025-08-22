import { Schema, model, Document } from "mongoose";

export interface Installment {
  amount: number;
  dueDate: Date;
}

export interface PlanDocument extends Document {
  name: string;
  description?: string;
  paymentType: "tuition" | "hostel" | "exam" | string;
  totalAmount: number; // full plan ka amount
  paymentMode: "one_time" | "installments" | "both";
  oneTimePaymentAmount?: number; // ✅ new field
  installmentCount?: number;
  installmentAmounts?: Installment[];
  lateFeeType?: "fixed" | "percentage";
  lateFeeValue?: number;
  startDate?: Date;
  endDate?: Date;
  status: "active" | "inactive";
}

const installmentSchema = new Schema<Installment>({
  amount: { type: Number, required: true },
  dueDate: { type: Date, required: true }
});

const planSchema = new Schema<PlanDocument>(
  {
    name: { type: String, required: true },
    description: String,
    paymentType: { type: String, required: true },
    totalAmount: { type: Number, required: true },
    paymentMode: { type: String, enum: ["one_time", "installments", "both"], required: true },

    // ✅ one-time specific
    oneTimePaymentAmount: { type: Number },

    installmentCount: Number,
    installmentAmounts: [installmentSchema],

    lateFeeType: { type: String, enum: ["fixed", "percentage"] },
    lateFeeValue: Number,
    startDate: Date,
    endDate: Date,
    status: { type: String, enum: ["active", "inactive"], default: "active" }
  },
  { timestamps: true }
);

export const Plan = model<PlanDocument>("Plan", planSchema);
