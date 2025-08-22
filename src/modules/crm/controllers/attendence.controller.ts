import { Request, Response } from "express";
import {
  AttendanceModel,
  AttendanceStatus,
  IAttendance,
} from "../models/attendence.model";
import { Types } from "mongoose";
import {
  getOfficeStartTime,
  getUtcRangeFromLocalDate,
  parseBool,
} from "../../../shared/utils/attendence";
import {
  normalizeDate,
  normalizeToISTStart,
} from "../../../shared/utils/normalizeToISTStart";
import moment from "moment";
import { startOfDay } from "date-fns";
import { LeavePolicyModel } from "../models/leavePolicy.model";
import { LeaveRequestModel } from "../models/leaveRequest.model";

class Attendence {
  async checkIn(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id; // auth middleware
      const ip = req.ip;
      const lateReason = req.body?.lateReason || false;

      const today = normalizeDate(new Date());

      // Find or create attendance for today
      let attendance = await AttendanceModel.findOne({
        employee_id: employeeId,
        date: today,
      });

      if (!attendance) {
        attendance = new AttendanceModel({
          employee_id: employeeId,
          date: today,
          status: "Present",
          sessions: [],
          created_by: employeeId,
          updated_by: employeeId,
        });
      }

      // Prevent multiple check-ins without check-out
      const lastSession = attendance.sessions[attendance.sessions.length - 1];
      if (lastSession && !lastSession.check_out_time) {
        return res.status(400).json({
          message: "Already checked in, please check out first.",
        });
      }

      // Shift timings
      const shiftStart = new Date();
      shiftStart.setHours(9, 30, 0, 0); // 9:30

      const halfDayCutoff = new Date();
      halfDayCutoff.setHours(14, 30, 0, 0); // 2:30

      const now = new Date();

      let status = "Present";
      let isLate = false;
      // let isHalfDay = false;

      if (now > halfDayCutoff) {
        // after 2:30 → Half Day
        status = "Half-Day";
        // isHalfDay = true;
      } else if (now > shiftStart) {
        // between 9:30 and 2:30 → Late
        isLate = true;
        status = "Present"; // still present but late
      }

      // Add new session
      attendance.sessions.push({
        check_in_time: now,
        check_in_ip: ip,
        is_late: isLate,
        is_manual_entry: false,
        is_late_reason: isLate ? lateReason || "Late clock-in" : false,
      });

      // Update metadata
      attendance.updated_by = employeeId;
      attendance.status = status;

      await attendance.save();

      res.json({ message: "Checked in successfully", attendance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error during check-in" });
    }
  }

  // ✅ Employee Check-Out
  async checkOut(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id;
      const ip = req.ip;

      // Normalize today's date
      const today = normalizeDate(new Date());

      // Fetch today's attendance
      const attendance = await AttendanceModel.findOne({
        employee_id: employeeId,
        date: today,
      });

      if (!attendance) {
        return res
          .status(404)
          .json({ message: "No attendance record found for today" });
      }

      const lastSession = attendance.sessions[attendance.sessions.length - 1];

      // Check if there is an active session
      if (!lastSession || lastSession.check_out_time) {
        return res
          .status(400)
          .json({ message: "No active session to check out." });
      }

      // Close session
      lastSession.check_out_time = new Date(); // current timestamp
      lastSession.check_out_ip = ip;

      // Calculate work hours for this session
      const workHours =
        (lastSession.check_out_time.getTime() -
          lastSession.check_in_time.getTime()) /
        (1000 * 60 * 60);

      lastSession.work_hours = Number(workHours.toFixed(2));

      // Update total work hours
      attendance.total_work_hours = attendance.sessions.reduce(
        (sum, s) => sum + (s.work_hours || 0),
        0
      );

      // ---- Business Rules ----
      const officeStart = new Date();
      officeStart.setHours(9, 30, 0, 0);

      const officeEnd = new Date();
      officeEnd.setHours(18, 30, 0, 0);

      const halfDayThreshold = 9; // 9 hours requirement
      const halfDayCutoff = new Date();
      halfDayCutoff.setHours(14, 30, 0, 0); // 2:30 PM

      // Check rules
      if (lastSession.check_out_time < halfDayCutoff) {
        attendance.status = "Early-Out"; // left before 2:30
      } else if (attendance.total_work_hours < halfDayThreshold) {
        attendance.status = "Half-Day"; // didn't complete 9 hrs
      } else {
        attendance.status = "Present"; // full day done
      }

      // Update metadata
      attendance.updated_by = employeeId;

      await attendance.save();

      res.json({ message: "Checked out successfully", attendance });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error during check-out" });
    }
  }

  // ✅ Status (for frontend: checkin or checkout button show karna hai?)
  async status(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id;
      const today = startOfDay(new Date());

      const attendance = await AttendanceModel.findOne({
        employee_id: employeeId,
        date: today,
      });

      if (!attendance) return res.json({ isCheckedIn: false });

      const lastSession = attendance.sessions[attendance.sessions.length - 1];

      if (lastSession && !lastSession.check_out_time) {
        return res.json({
          isCheckedIn: true,
          lastCheckInTime: lastSession.check_in_time,
        });
      }

      res.json({ isCheckedIn: false });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching status" });
    }
  }

  // ✅ Today’s Attendance Details
  async getToday(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id;
      const today = startOfDay(new Date());

      const attendance = await AttendanceModel.findOne({
        employee_id: employeeId,
        date: today,
      });

      if (!attendance)
        return res
          .status(404)
          .json({ message: "No attendance found for today" });

      res.json(attendance);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching today’s attendance" });
    }
  }

  async getAllAttendances(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id;
      const { startDate, endDate } = req.query;

      const now = new Date();
      const start = startDate
        ? new Date(startDate as string)
        : new Date(now.getFullYear(), now.getMonth(), 1);
      const end = endDate ? new Date(endDate as string) : now;

      const normalizeDate = (d: Date) =>
        new Date(d.getFullYear(), d.getMonth(), d.getDate());

      // fetch existing attendance records
      let attendances = await AttendanceModel.find({
        employee_id: employeeId,
        date: { $gte: normalizeDate(start), $lte: normalizeDate(end) },
      }).sort({ date: 1 });

      // map for quick lookup
      const attendanceMap = new Map<string, any>();
      attendances.forEach((a) =>
        attendanceMap.set(normalizeDate(a.date).toISOString(), a)
      );

      // fetch leave policy for holidays
      const leavePolicy = await LeavePolicyModel.findOne({
        year: now.getFullYear(),
      });

      // set of holiday dates
      const holidaySet = new Set<string>();
      if (leavePolicy) {
        leavePolicy.holidays.forEach((h) =>
          holidaySet.add(normalizeDate(new Date(h.date)).toISOString())
        );
      }

      // fetch approved leaves
      const approvedLeaves = await LeaveRequestModel.find({
        user_id: employeeId,
        status: "Approved",
        start_date: { $lte: end },
        end_date: { $gte: start },
      });

      // convert approved leaves into a set of dates
      const leaveSet = new Set<string>();
      approvedLeaves.forEach((leave) => {
        let d = new Date(leave.start_date);
        while (d <= leave.end_date) {
          leaveSet.add(normalizeDate(d).toISOString());
          d.setDate(d.getDate() + 1);
        }
      });

      const summary: any[] = [];

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const key = normalizeDate(d).toISOString();
        const day = d.getDay();

        // Weekend skip
        if ((day === 0 || day === 6) && !attendanceMap.has(key)) {
          continue;
        }

        // Holiday skip
        if (holidaySet.has(key) && !attendanceMap.has(key)) {
          continue;
        }

        // Approved leave skip
        if (leaveSet.has(key) && !attendanceMap.has(key)) {
          continue;
        }

        if (attendanceMap.has(key)) {
          const a = attendanceMap.get(key);
          const firstSession = a.sessions[0];
          const lastSession = a.sessions[a.sessions.length - 1];

          summary.push({
            date: a.date,
            status: a.status,
            first_check_in: firstSession ? firstSession.check_in_time : null,
            last_check_out: lastSession ? lastSession.check_out_time : null,
            total_work_hours: a.total_work_hours,
          });
        } else {
          // mark as absent if not weekend/holiday/approved leave
          let absentRecord = await AttendanceModel.findOne({
            employee_id: employeeId,
            date: normalizeDate(d),
          });

          if (!absentRecord) {
            absentRecord = await AttendanceModel.create({
              employee_id: employeeId,
              date: normalizeDate(d),
              status: "Absent",
              sessions: [],
              total_work_hours: 0,
              created_by: employeeId,
              updated_by: employeeId,
            });
          }

          summary.push({
            date: absentRecord.date,
            status: absentRecord.status,
            first_check_in: null,
            last_check_out: null,
            total_work_hours: 0,
          });
        }
      }

      res.json(summary);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Error fetching monthly attendance" });
    }
  }

  //   async checkIn(req: Request, res: Response) {
  //     try {
  //       const userId = req.user?.user?._id; // from auth middleware
  //       const { ip, notes } = req.body;

  //       // today ki date (midnight reset)
  //       const today = new Date();
  //       today.setHours(0, 0, 0, 0);

  //       // check if attendance doc already exists for today
  //       let attendance: IAttendance | null = await AttendanceModel.findOne({
  //         employee_id: userId,
  //         date: today,
  //       });

  //       if (!attendance) {
  //         // create fresh attendance doc
  //         attendance = await AttendanceModel.create({
  //           employee_id: userId,
  //           date: today,
  //           status: "Present",
  //           sessions: [],
  //           total_work_hours: 0,
  //           notes: notes || "",
  //           created_by: userId,
  //           updated_by: userId,
  //         });
  //       }

  //       // check if last session is not closed yet
  //       const lastSession = attendance.sessions[attendance.sessions.length - 1];
  //       if (lastSession && !lastSession.check_out_time) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "You are already checked in. Please checkout first.",
  //         });
  //       }

  //       // add new session
  //       attendance.sessions.push({
  //         check_in_time: new Date(),
  //         check_in_ip: ip || req.ip,
  //         is_manual_entry: false,
  //         is_late: false, // calculate based on office policy later
  //       });

  //       attendance.updated_by = userId;
  //       await attendance.save();

  //       return res.status(201).json({
  //         success: true,
  //         message: "Checked in successfully.",
  //         data: attendance,
  //       });
  //     } catch (err) {
  //       console.error("Check-in error:", err);
  //       return res.status(500).json({
  //         success: false,
  //         message: "Internal server error",
  //       });
  //     }
  //   }

  //   async createUserAttendence(req: Request, res: Response) {
  //     try {
  //       // 0) Identify employee (assume auth middleware put it on req.user)
  //       const employeeId = (req as any).user?.user?._id || req.user?.user?._id;
  //       if (!employeeId) {
  //         return res.status(401).json({ message: "Unauthorized" });
  //       }

  //       // Optional: allow admin to mark for someone else
  //       const forEmployeeId = (req.body?.employeeId || employeeId).toString();

  //       // 1) Normalize date to IST start-of-day
  //       const date = normalizeToISTStart(req.body?.date);

  //       // 2) Idempotent fetch
  //       let existing = await AttendanceModel.findOne({
  //         employee_id: forEmployeeId,
  //         date,
  //       }).lean();

  //       if (existing) {
  //         return res.status(200).json({
  //           message: "Attendance already marked for this day",
  //           data: {
  //             attendanceId: existing._id,
  //             status: existing.status,
  //             date: existing.date,
  //             sessions: existing.sessions ?? [],
  //             total_work_hours: existing.total_work_hours ?? 0,
  //           },
  //         });
  //       }

  //       // 3) Create base record (simple: mark Present at clock-in start)
  //       const doc = await AttendanceModel.create({
  //         employee_id: forEmployeeId,
  //         date,
  //         status: AttendanceStatus.Present, // later adjust after checkout if needed
  //         sessions: [],
  //         total_work_hours: 0,
  //         created_by: employeeId,
  //       });

  //       // 4) Success
  //       return res.status(201).json({
  //         message: "Attendance marked",
  //         data: {
  //           attendanceId: doc._id,
  //           status: doc.status,
  //           date: doc.date,
  //           sessions: doc.sessions,
  //           total_work_hours: doc.total_work_hours,
  //         },
  //       });
  //     } catch (err: any) {
  //       // 5) Handle race condition on unique index
  //       if (err?.code === 11000) {
  //         const { employee_id, date } = err.keyValue || {};
  //         const dup = await AttendanceModel.findOne({ employee_id, date }).lean();
  //         if (dup) {
  //           return res.status(200).json({
  //             message: "Attendance already marked for this day",
  //             data: {
  //               attendanceId: dup._id,
  //               status: dup.status,
  //               date: dup.date,
  //               sessions: dup.sessions ?? [],
  //               total_work_hours: dup.total_work_hours ?? 0,
  //             },
  //           });
  //         }
  //       }
  //       // Fallback
  //       console.error("createUserAttendence error:", err);
  //       return res.status(500).json({ message: "Failed to mark attendance" });
  //     }
  //   }

  //   async checkOut(req: Request, res: Response) {
  //     try {
  //       const userId = req.user?.user?._id; // from auth middleware
  //       const { ip } = req.body;

  //       const today = new Date();
  //       today.setHours(0, 0, 0, 0);

  //       const attendance = await AttendanceModel.findOne({
  //         employee_id: userId,
  //         date: today,
  //       });

  //       if (!attendance) {
  //         return res.status(404).json({
  //           success: false,
  //           message: "No active session found for today.",
  //         });
  //       }

  //       const lastSession = attendance.sessions[attendance.sessions.length - 1];
  //       if (!lastSession || lastSession.check_out_time) {
  //         return res.status(400).json({
  //           success: false,
  //           message: "You are not currently checked in.",
  //         });
  //       }

  //       // checkout time
  //       const now = new Date();
  //       lastSession.check_out_time = now;
  //       lastSession.check_out_ip = ip || req.ip;

  //       // calculate work hours for this session
  //       const workMs = now.getTime() - lastSession.check_in_time.getTime();
  //       const workHours = workMs / (1000 * 60 * 60);
  //       lastSession.work_hours = parseFloat(workHours.toFixed(2));

  //       // recalc total work hours
  //       attendance.total_work_hours = attendance.sessions.reduce(
  //         (acc: any, s: any) => acc + (s.work_hours || 0),
  //         0
  //       );

  //       attendance.updated_by = userId;
  //       await attendance.save();

  //       return res.status(200).json({
  //         success: true,
  //         message: "Checked out successfully.",
  //         data: attendance,
  //       });
  //     } catch (err) {
  //       console.error("Check-out error:", err);
  //       return res.status(500).json({
  //         success: false,
  //         message: "Internal server error",
  //       });
  //     }
  //   }

  //   async getTodayAttendance(req: Request, res: Response) {

  //     try {
  //       const  employeeId  = req.user?.user?._id;

  //       if (!employeeId) {
  //         return res.status(400).json({ message: "employeeId is required" });
  //       }

  //       // get today's start and end
  //       const todayStart = moment().startOf("day").toDate();
  //       const todayEnd = moment().endOf("day").toDate();

  //       // find attendance record for today
  //       const attendance = await AttendanceModel.findOne({
  //         employeeId,
  //         date: { $gte: todayStart, $lte: todayEnd },
  //       });

  //       if (!attendance) {
  //         // no record yet → user abhi tak clock-in nahi kiya
  //         return res.json({
  //           attendance: null,
  //           canClockIn: true,
  //           canClockOut: false,
  //         });
  //       }

  //       // check last session
  //       const lastSession = attendance.sessions[attendance.sessions.length - 1];

  //       let canClockIn = false;
  //       let canClockOut = false;

  //       if (lastSession && !lastSession.check_out_time) {
  //         // matlab user andar hai, ab sirf clock-out kar sakta hai
  //         canClockIn = false;
  //         canClockOut = true;
  //       } else {
  //         // matlab user bahar hai, ab clock-in kar sakta hai
  //         canClockIn = true;
  //         canClockOut = false;
  //       }

  //       return res.json({
  //         attendance,
  //         canClockIn,
  //         canClockOut,
  //       });
  //     } catch (err: any) {
  //       console.error("Error in getTodayAttendance:", err);
  //       return res.status(500).json({ message: "Internal server error" });
  //     }
  //   }

  //   async checkOut(req: Request, res: Response) {
  //     try {
  //       const userId = req.user?.user?._id;
  //       const now = new Date();

  //       // Normalize today's date to 00:00:00
  //       const today = new Date();
  //       today.setHours(0, 0, 0, 0);

  //       // Find today's attendance record
  //       const attendance = await AttendanceModel.findOne({
  //         employee_id: userId,
  //         date: today,
  //       });

  //       if (!attendance) {
  //         return res.status(404).json({
  //           message: "No check-in record found for today.",
  //         });
  //       }

  //       if (attendance.check_out_time) {
  //         return res.status(409).json({
  //           message: "You have already checked out today.",
  //           data: attendance,
  //         });
  //       }

  //       // Calculate working duration
  //       if (!attendance.check_in_time) {
  //         return res.status(400).json({
  //           message: "Check-in time is missing for today's attendance record.",
  //         });
  //       }
  //       const checkInTime = new Date(attendance.check_in_time);
  //       const durationMs = now.getTime() - checkInTime.getTime();
  //       const durationHours = parseFloat(
  //         (durationMs / (1000 * 60 * 60)).toFixed(2)
  //       );

  //       // Optional notes
  //       const notes = req.body.notes;
  //       if (notes && typeof notes !== "string") {
  //         return res.status(400).json({
  //           message: "Notes must be a string.",
  //         });
  //       }

  //       // Update attendance
  //       attendance.check_out_time = now;
  //       attendance.work_hours = durationHours;
  //       attendance.check_out_ip = req.ip;
  //       attendance.updated_by = userId;
  //       if (notes)
  //         attendance.notes = (attendance.notes || "") + ` | Checkout: ${notes}`;

  //       await attendance.save();

  //       return res.status(200).json({
  //         message: "Check-out successful!",
  //         data: attendance,
  //       });
  //     } catch (err) {
  //       console.error("Check-out failed:", err);
  //       return res.status(500).json({
  //         message: "Server error during check-out.",
  //         error: err instanceof Error ? err.message : err,
  //       });
  //     }
  //   }

  //   async getMyAttendance(req: Request, res: Response) {
  //     try {
  //       const userId = req.user?.user?._id;

  //       const records = await AttendanceModel.find({
  //         employee_id: userId,
  //       }).sort({ date: -1 }); // latest first

  //       return res.status(200).json({
  //         message: "Fetched attendance records successfully.",
  //         data: records,
  //       });
  //     } catch (error) {
  //       console.error("Error fetching attendance:", error);
  //       return res.status(500).json({
  //         message: "Error retrieving attendance.",
  //         error: error instanceof Error ? error.message : error,
  //       });
  //     }
  //   }
  //   async getMyAttendanceByDate(req: Request, res: Response) {
  //     try {
  //       const userId = req.user?.user?._id;
  //       const dateParam = req.params.date; // Expecting "2025-07-29"

  //       const date = new Date(dateParam);
  //       if (isNaN(date.getTime())) {
  //         return res.status(400).json({ message: "Invalid date format." });
  //       }

  //       // Normalize to start of day
  //       date.setHours(0, 0, 0, 0);

  //       const record = await AttendanceModel.findOne({
  //         employee_id: userId,
  //         date: date,
  //       });

  //       if (!record) {
  //         return res.status(404).json({
  //           message: "No attendance record found for this date.",
  //         });
  //       }

  //       return res.status(200).json({
  //         message: "Attendance record found.",
  //         data: record,
  //       });
  //     } catch (err) {
  //       console.error("Error fetching record:", err);
  //       return res.status(500).json({
  //         message: "Something went wrong.",
  //         error: err instanceof Error ? err.message : err,
  //       });
  //     }
  //   }

  //   async getAllAttendance(req: Request, res: Response) {
  //     try {
  //       const {
  //         page = "1",
  //         limit = "10",
  //         status,
  //         employee_id,
  //         date,
  //         from,
  //         to,
  //         is_late,
  //         is_manual_entry,
  //       } = req.query;

  //       const filters: Record<string, any> = {};

  //       // 🧩 Optional Filters
  //       if (typeof status === "string" && status.trim()) {
  //         filters.status = status.trim();
  //       }

  //       if (
  //         typeof employee_id === "string" &&
  //         Types.ObjectId.isValid(employee_id)
  //       ) {
  //         filters.employee_id = employee_id.trim();
  //       }

  //       if (typeof is_late === "string") {
  //         const parsed = parseBool(is_late);
  //         if (parsed !== null) filters.is_late = parsed;
  //       }

  //       if (typeof is_manual_entry === "string") {
  //         const parsed = parseBool(is_manual_entry);
  //         if (parsed !== null) filters.is_manual_entry = parsed;
  //       }

  //       // 📅 Date Filtering (IST aware, but compare with UTC timestamps)
  //       if (typeof date === "string" && date.trim()) {
  //         const { start, end } = getUtcRangeFromLocalDate(date.trim());
  //         filters.date = { $gte: start, $lt: end };
  //       } else if (
  //         typeof from === "string" &&
  //         typeof to === "string" &&
  //         from.trim() &&
  //         to.trim()
  //       ) {
  //         const { start: fromStart } = getUtcRangeFromLocalDate(from.trim());
  //         const { end: toEnd } = getUtcRangeFromLocalDate(to.trim());
  //         filters.date = { $gte: fromStart, $lt: toEnd };
  //       } else {
  //         // Default to today (IST)
  //         const today = new Date();
  //         const istToday = new Date(
  //           today.toLocaleString("en-US", { timeZone: "Asia/Kolkata" })
  //         );
  //         istToday.setHours(0, 0, 0, 0);
  //         const start = new Date(istToday.toISOString());
  //         const end = new Date(start);
  //         end.setUTCDate(start.getUTCDate() + 1);
  //         filters.date = { $gte: start, $lt: end };
  //       }

  //       // 📊 Pagination Setup
  //       const pageNum = Math.max(1, parseInt(page as string, 10));
  //       const pageSize = Math.max(1, parseInt(limit as string, 10));
  //       const skip = (pageNum - 1) * pageSize;

  //       // 🚀 Query Mongo
  //       const [data, total] = await Promise.all([
  //         AttendanceModel.find(filters)
  //           .populate("employee_id", "name email")
  //           .sort({ date: -1 })
  //           .skip(skip)
  //           .limit(pageSize),
  //         AttendanceModel.countDocuments(filters),
  //       ]);

  //       return res.status(200).json({
  //         success: true,
  //         message: "Attendance records fetched successfully",
  //         total,
  //         page: pageNum,
  //         pages: Math.ceil(total / pageSize),
  //         limit: pageSize,
  //         data,
  //       });
  //     } catch (error) {
  //       console.error("❌ Admin getAllAttendance error:", error);
  //       return res.status(500).json({
  //         success: false,
  //         message: "Something went wrong while fetching attendance.",
  //       });
  //     }
  //   }
}

export const attendence = new Attendence();
