// src/models/LoanRepayment.ts
import mongoose, { Document, Schema, Model } from "mongoose";
import { LoanRepayment } from "../types";

export interface ILoanRepayment extends Document, LoanRepayment { }

const loanRepaymentSchema = new Schema<ILoanRepayment>(
    {
        loanRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "LoanRequest",
            required: true,
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        month: {
            type: String, required: true,

            match: /^\d{4}-(0[1-9]|1[0-2])$/,
        },
        amount: { type: Number, required: true, min: 1 },
        status: {
            type: String,
            enum: ["unpaid", "paid"],
            default: "unpaid",
        },
        paidAt: { type: Date },
        comment: { type: String },
        dueDate: { type: Date },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

loanRepaymentSchema.index({ loanRequestId: 1 });
loanRepaymentSchema.index({ employeeId: 1 });


const LoanRepayment: Model<ILoanRepayment> =
    mongoose.models.LoanRepayment || mongoose.model<ILoanRepayment>("LoanRepayment", loanRepaymentSchema);

export default LoanRepayment;
