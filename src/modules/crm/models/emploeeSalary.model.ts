import { Schema, model, Document } from "mongoose";

export interface IEmployeeSalary extends Document {
    employee_id: Schema.Types.ObjectId;
    base_salary: number;
    bonuses?: number;
    deductions?: number;
    pay_cycle: "monthly" | "weekly";
    currency?: string;
    effective_from: Date;
    configured_by?: Schema.Types.ObjectId; // Admin ID
    remarks?: string;
}

const EmployeeSalarySchema = new Schema<IEmployeeSalary>(
    {
        employee_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true, // Har employee ka ek hi salary config hoga at a time
            index: true
        },
        base_salary: { type: Number, required: true },
        bonuses: { type: Number, default: 0 },
        deductions: { type: Number, default: 0 },
        pay_cycle: {
            type: String,
            enum: ["monthly", "weekly"],
            default: "monthly"
        },
        currency: { type: String, default: "INR" },
        effective_from: { type: Date, default: Date.now },
        configured_by: {
            type: Schema.Types.ObjectId,
            ref: "User", // Admin
            required: false,
        },

        remarks: { type: String }
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

export const EmployeeSalaryModel = model<IEmployeeSalary>(
    "EmployeeSalary",
    EmployeeSalarySchema
);
