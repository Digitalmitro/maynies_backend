import { Request, Response } from "express";
import { AttendanceModel, AttendanceStatus } from "../models/attendence.model";
import { Types } from "mongoose";
import { getOfficeStartTime, getUtcRangeFromLocalDate, parseBool } from "../../../shared/utils/attendence";

class Attendence {

    async checkIn(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id as Types.ObjectId;
            const ip = req.ip;
            const userAgent = req.headers["user-agent"] || "Unknown Device";
            const now = new Date();

            // Normalize today's date
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Prevent double check-in
            const alreadyCheckedIn = await AttendanceModel.findOne({
                employee_id: userId,
                date: today,
            });

            if (alreadyCheckedIn) {
                return res.status(409).json({
                    message: "You have already checked in today.",
                    data: alreadyCheckedIn,
                });
            }

            // Calculate late status
            const officeStart = getOfficeStartTime(now);
            const isLate = now > officeStart;
            const lateByMinutes = isLate
                ? Math.floor((now.getTime() - officeStart.getTime()) / 60000)
                : 0;

            // Require reason if late
            if (isLate && !req.body.is_late_reason) {
                return res.status(400).json({
                    message: "Late check-ins require a reason.",
                });
            }

            // Optional: Validate notes
            const notes = req.body.notes;
            if (notes && typeof notes !== "string") {
                return res.status(400).json({
                    message: "Notes must be a string.",
                });
            }

            const attendance = await AttendanceModel.create({
                employee_id: userId,
                date: today,
                status: AttendanceStatus.Present,
                check_in_time: now,
                check_in_ip: ip,
                is_late: isLate,
                late_by_minutes: lateByMinutes,
                is_late_reason: isLate ? req.body.is_late_reason : "",
                user_agent: userAgent,
                notes: notes || "",
                created_by: userId,
            });

            return res.status(201).json({
                message: "Check-in successful!",
                data: attendance,
            });
        } catch (err) {
            console.error("Check-in failed:", err);
            return res.status(500).json({
                message: "Server error during check-in.",
                error: err instanceof Error ? err.message : err,
            });
        }
    }

    async checkOut(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id;
            const now = new Date();

            // Normalize today's date to 00:00:00
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Find today's attendance record
            const attendance = await AttendanceModel.findOne({
                employee_id: userId,
                date: today,
            });

            if (!attendance) {
                return res.status(404).json({
                    message: "No check-in record found for today.",
                });
            }

            if (attendance.check_out_time) {
                return res.status(409).json({
                    message: "You have already checked out today.",
                    data: attendance,
                });
            }

            // Calculate working duration
            if (!attendance.check_in_time) {
                return res.status(400).json({
                    message: "Check-in time is missing for today's attendance record.",
                });
            }
            const checkInTime = new Date(attendance.check_in_time);
            const durationMs = now.getTime() - checkInTime.getTime();
            const durationHours = parseFloat((durationMs / (1000 * 60 * 60)).toFixed(2));

            // Optional notes
            const notes = req.body.notes;
            if (notes && typeof notes !== "string") {
                return res.status(400).json({
                    message: "Notes must be a string.",
                });
            }

            // Update attendance
            attendance.check_out_time = now;
            attendance.work_hours = durationHours;
            attendance.check_out_ip = req.ip;
            attendance.updated_by = userId;
            if (notes) attendance.notes = (attendance.notes || "") + ` | Checkout: ${notes}`;

            await attendance.save();

            return res.status(200).json({
                message: "Check-out successful!",
                data: attendance,
            });
        } catch (err) {
            console.error("Check-out failed:", err);
            return res.status(500).json({
                message: "Server error during check-out.",
                error: err instanceof Error ? err.message : err,
            });
        }
    }

    async getMyAttendance(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id;

            const records = await AttendanceModel.find({
                employee_id: userId
            }).sort({ date: -1 }); // latest first

            return res.status(200).json({
                message: "Fetched attendance records successfully.",
                data: records
            });

        } catch (error) {
            console.error("Error fetching attendance:", error);
            return res.status(500).json({
                message: "Error retrieving attendance.",
                error: error instanceof Error ? error.message : error
            });
        }
    }
    async getMyAttendanceByDate(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id;
            const dateParam = req.params.date; // Expecting "2025-07-29"

            const date = new Date(dateParam);
            if (isNaN(date.getTime())) {
                return res.status(400).json({ message: "Invalid date format." });
            }

            // Normalize to start of day
            date.setHours(0, 0, 0, 0);

            const record = await AttendanceModel.findOne({
                employee_id: userId,
                date: date,
            });

            if (!record) {
                return res.status(404).json({
                    message: "No attendance record found for this date.",
                });
            }

            return res.status(200).json({
                message: "Attendance record found.",
                data: record,
            });

        } catch (err) {
            console.error("Error fetching record:", err);
            return res.status(500).json({
                message: "Something went wrong.",
                error: err instanceof Error ? err.message : err,
            });
        }
    }


    async getAllAttendance(req: Request, res: Response) {
        try {
            const {
                page = "1",
                limit = "10",
                status,
                employee_id,
                date,
                from,
                to,
                is_late,
                is_manual_entry,
            } = req.query;

            const filters: Record<string, any> = {};

            // 🧩 Optional Filters
            if (typeof status === "string" && status.trim()) {
                filters.status = status.trim();
            }

            if (typeof employee_id === "string" && Types.ObjectId.isValid(employee_id)) {
                filters.employee_id = employee_id.trim();
            }

            if (typeof is_late === "string") {
                const parsed = parseBool(is_late);
                if (parsed !== null) filters.is_late = parsed;
            }

            if (typeof is_manual_entry === "string") {
                const parsed = parseBool(is_manual_entry);
                if (parsed !== null) filters.is_manual_entry = parsed;
            }

            // 📅 Date Filtering (IST aware, but compare with UTC timestamps)
            if (typeof date === "string" && date.trim()) {
                const { start, end } = getUtcRangeFromLocalDate(date.trim());
                filters.date = { $gte: start, $lt: end };
            } else if (typeof from === "string" && typeof to === "string" && from.trim() && to.trim()) {
                const { start: fromStart } = getUtcRangeFromLocalDate(from.trim());
                const { end: toEnd } = getUtcRangeFromLocalDate(to.trim());
                filters.date = { $gte: fromStart, $lt: toEnd };
            } else {
                // Default to today (IST)
                const today = new Date();
                const istToday = new Date(today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
                istToday.setHours(0, 0, 0, 0);
                const start = new Date(istToday.toISOString());
                const end = new Date(start);
                end.setUTCDate(start.getUTCDate() + 1);
                filters.date = { $gte: start, $lt: end };
            }

            // 📊 Pagination Setup
            const pageNum = Math.max(1, parseInt(page as string, 10));
            const pageSize = Math.max(1, parseInt(limit as string, 10));
            const skip = (pageNum - 1) * pageSize;

            // 🚀 Query Mongo
            const [data, total] = await Promise.all([
                AttendanceModel.find(filters)
                    .populate("employee_id", "name email")
                    .sort({ date: -1 })
                    .skip(skip)
                    .limit(pageSize),
                AttendanceModel.countDocuments(filters),
            ]);

            return res.status(200).json({
                success: true,
                message: "Attendance records fetched successfully",
                total,
                page: pageNum,
                pages: Math.ceil(total / pageSize),
                limit: pageSize,
                data,
            });

        } catch (error) {
            console.error("❌ Admin getAllAttendance error:", error);
            return res.status(500).json({
                success: false,
                message: "Something went wrong while fetching attendance.",
            });
        }
    }
}

export const attendence = new Attendence();

