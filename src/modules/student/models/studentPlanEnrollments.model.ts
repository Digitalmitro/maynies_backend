import { Schema, model, Document, Types } from "mongoose";

export interface StudentPlanEnrollmentDocument extends Document {
  studentId: Types.ObjectId;   // ref Student
  planId: Types.ObjectId;      // ref Plan
  paymentMode: "one_time" | "installments";
  status: "pending" | "enrolled" | "rejected" | "completed" | "cancelled";
  assignedAt: Date;
  enrolledAt?: Date;
  completedAt?: Date;
  remarks?: string;
  deletedAt?: Date;
}

const studentPlanEnrollmentSchema = new Schema<StudentPlanEnrollmentDocument>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    planId: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    paymentMode: { type: String, enum: ["one_time", "installments"], required: true },
    status: {
      type: String,
      enum: ["pending", "enrolled", "rejected", "completed", "cancelled"],
      default: "pending"
    },
    assignedAt: { type: Date, default: Date.now },
    enrolledAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    remarks: { type: String },
    deletedAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const StudentPlanEnrollment = model<StudentPlanEnrollmentDocument>(
  "StudentPlanEnrollment",
  studentPlanEnrollmentSchema
);
