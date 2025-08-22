import { Schema, model, Document, Types } from "mongoose";

export interface IAttendanceSession {
  check_in_time: Date;
  check_out_time?: Date;
  check_in_ip?: string;
  check_out_ip?: string;
  work_hours?: number; // auto-calculated: diff of in-out
  is_manual_entry?: boolean;
  is_late?: boolean;
  is_late_reason?: string;
  is_auto_checkout?: boolean; // true if auto-checked out by system
}

export interface IAttendance extends Document {
  employee_id: Types.ObjectId;
  date: Date;
  status: string;
  sessions: IAttendanceSession[]; // multiple check-in/out in one day
  total_work_hours: number; // sum of all sessions
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
  Holiday = "Holiday",
}

const AttendanceSessionSchema = new Schema<IAttendanceSession>({
  check_in_time: { type: Date, required: true },
  check_out_time: { type: Date, default: null },
  check_in_ip: { type: String, default: null },
  check_out_ip: { type: String, default: null },
  work_hours: { type: Number, default: 0 },
  is_manual_entry: { type: Boolean, default: false },
  is_late: { type: Boolean, default: false },
  is_late_reason: { type: String, default: "" },
  is_auto_checkout: { type: Boolean, default: false }
});

const AttendanceSchema = new Schema<IAttendance>(
  {
    employee_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    date: { type: Date, required: true, index: true },
    status: {
      type: String,
      enum: Object.values(AttendanceStatus),
      required: true,
    },

    // 👇 session-based structure
    sessions: { type: [AttendanceSessionSchema], default: [] },

    // 👇 total for the day (aggregated from sessions)
    total_work_hours: { type: Number, default: 0 },

    notes: { type: String, default: "" },
    approved_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    created_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    updated_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

// 🧷 Unique index to prevent duplicate entries per employee per day
AttendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

export const AttendanceModel = model<IAttendance>(
  "Attendance",
  AttendanceSchema
);
