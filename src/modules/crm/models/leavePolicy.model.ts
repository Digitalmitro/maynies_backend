import { Schema, model, Document } from "mongoose";

interface ILeavePolicy extends Document {
    year: number; // Example: 2025
    vacation_days: number; // Example: 12
    sick_days: number; // Example: 8
    casual_days: number; // Example: 3
    holidays: {
        date: Date;
        name: string;
    }[];
}

const LeavePolicySchema = new Schema<ILeavePolicy>({
    year: { type: Number, required: true, unique: true },
    vacation_days: { type: Number, required: true },
    sick_days: { type: Number, required: true },
    casual_days: { type: Number, required: true },
    holidays: [
        {
            date: { type: Date, required: true },
            name: { type: String, required: true },
        }
    ]
}, {
    timestamps: true
});

export const LeavePolicyModel = model<ILeavePolicy>("LeavePolicy", LeavePolicySchema);
