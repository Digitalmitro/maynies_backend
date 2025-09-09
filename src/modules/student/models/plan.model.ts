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
  installmentAmounts?: Installment[];
  status: "active" | "inactive";
  deletedAt?: Date;
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
    installmentAmounts: [installmentSchema],
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    deletedAt: { type: Date, default: null }

  },
  { timestamps: true }
);

export const Plan = model<PlanDocument>("Plan", planSchema);
