import { Document, Schema, model } from "mongoose";

interface ILeaveBalance extends Document {
    user_id: Schema.Types.ObjectId;
    year: number;
    total_vacation: number;
    total_sick: number;
    total_casual: number;
    vacation_balance: number;
    sick_balance: number;
    casual_balance: number;
}

const LeaveBalanceSchema = new Schema<ILeaveBalance>(
    {
        user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
        year: { type: Number, required: true },
        total_vacation: { type: Number, required: true },
        total_sick: { type: Number, required: true },
        total_casual: { type: Number, required: true },
        vacation_balance: { type: Number, required: true },
        sick_balance: { type: Number, required: true },
        casual_balance: { type: Number, required: true }
    },
    {
        timestamps: true
    }
);

// 🏷 Make user_id + year unique
LeaveBalanceSchema.index({ user_id: 1, year: 1 }, { unique: true });

export const LeaveBalanceModel = model<ILeaveBalance>(
    "LeaveBalance",
    LeaveBalanceSchema
);
