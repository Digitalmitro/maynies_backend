import { Schema, model, Document, Types } from "mongoose";

export interface StudentPlanDocument extends Document {
  studentId: Types.ObjectId;
  planId: Types.ObjectId;
  chosenMode: "one_time" | "installments";
  assignedAt: Date;
  status: "active" | "completed" | "overdue";
}

const studentPlanSchema = new Schema<StudentPlanDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    chosenMode: { type: String, enum: ["one_time", "installments"], required: true },
    assignedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["active", "completed", "overdue"], default: "active" }
  },
  { timestamps: true }
);

export const StudentPlan = model<StudentPlanDocument>("StudentPlan", studentPlanSchema);
