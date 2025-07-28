// src/models/LoanRequest.ts
import "./loanRepayment.model"; // this registers the model
import mongoose, { Document, Schema, Model } from "mongoose";
import { LoanRequest } from "../types";

export interface ILoanRequest extends Document, LoanRequest { }

const loanRequestSchema = new Schema<ILoanRequest>(
    {
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        amount: { type: Number, required: true },
        durationMonths: { type: Number, required: true, min: 1 },
        reason: { type: String },
        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending",
        },
        notes: { type: String },

        approvedAt: { type: Date },
        rejectedAt: { type: Date },
    },
    { timestamps: true }
);
loanRequestSchema.virtual('repayments', {
    ref: 'LoanRepayment',
    localField: '_id',
    foreignField: 'loanRequestId',
});

loanRequestSchema.set("toObject", { virtuals: true });
loanRequestSchema.set("toJSON", { virtuals: true });


const LoanRequest: Model<ILoanRequest> =
    mongoose.models.LoanRequest || mongoose.model<ILoanRequest>("LoanRequest", loanRequestSchema);

export default LoanRequest;
