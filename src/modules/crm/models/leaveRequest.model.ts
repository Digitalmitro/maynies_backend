import { model, Schema } from "mongoose";

interface ILeaveRequest extends Document {
    user_id: Schema.Types.ObjectId;
    type: "Vacation" | "Sick" | "Casual";
    start_date: Date;
    end_date: Date;
    total_days: number;
    reason: string;
    status: "Pending" | "Approved" | "Rejected";
    admin_comment?: string;
}

const LeaveRequestSchema = new Schema<ILeaveRequest>({
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["Vacation", "Sick", "Casual"], required: true },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    total_days: { type: Number, required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
    admin_comment: { type: String }
}, {
    timestamps: true
});

export const LeaveRequestModel = model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);
