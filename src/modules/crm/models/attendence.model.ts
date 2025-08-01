import { Schema, model, Document, Types } from "mongoose";

export interface IAttendance extends Document {
    employee_id: Types.ObjectId;
    date: Date;
    status: string;
    check_in_time?: Date;
    check_out_time?: Date;
    check_in_ip?: string;
    check_out_ip?: string;
    work_hours?: number;
    is_manual_entry?: boolean;
    is_late_reason?: string;
    is_late?: boolean;
    approved_by?: Types.ObjectId;
    notes?: string;
    created_by?: Types.ObjectId;
    updated_by?: Types.ObjectId;
    created_at: Date;
    updated_at: Date;
}

export enum AttendanceStatus {
    Present = "Present",
    Absent = "Absent",
    Leave = "Leave",
    HalfDay = "Half-Day",
    Late = "Late",
    EarlyOut = "Early-Out",
    WFH = "WFH",
    Weekend = "Weekend",
    Holiday = "Holiday"
}

const AttendanceSchema = new Schema<IAttendance>({
    employee_id: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    status: { type: String, enum: Object.values(AttendanceStatus), required: true },
    check_in_time: { type: Date, default: null },
    check_out_time: { type: Date, default: null },
    check_in_ip: { type: String, default: null },
    check_out_ip: { type: String, default: null },
    work_hours: { type: Number, default: 0 },
    notes: { type: String, default: "" },
    is_late_reason: { type: String, default: "" },
    is_late: { type: Boolean, default: false },
    approved_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    is_manual_entry: { type: Boolean, default: false },
}, {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});


// 🧷 Unique index to prevent duplicate entries
AttendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

export const AttendanceModel = model<IAttendance>("Attendance", AttendanceSchema);
