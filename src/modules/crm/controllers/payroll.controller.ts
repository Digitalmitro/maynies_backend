import { Request, Response } from "express";
import PayrollModel from "../models/payroll.model";
import { EmployeeProfileModel } from "../models/employer.model";
import { EmployeeSalaryModel } from "../models/emploeeSalary.model";
import { AttendanceModel, AttendanceStatus } from "../models/attendence.model";
import { LeaveRequestModel } from "../models/leaveRequest.model";
import { LeavePolicyModel } from "../models/leavePolicy.model";
import { Schema } from "mongoose";
import { LeaveBalanceModel } from "../models/leaveBalance.model";
import payrollModel from "../models/payroll.model";
// import AttendanceModel from "../models/attendance.model";
// import SalaryModel from "../models/salary.model";
// import LeaveRequestModel from "../models/leaveRequest.model";
// import EmployeeModel from "../models/employee.model";

// const generateWorkingDays = async (month: number, year: number) => {
//   try {
//     // Step 1: Total days in month
//     const totalDays = new Date(year, month, 0).getDate();

//     // Step 2: Create all dates in the month
//     const allDates = [];
//     for (let day = 1; day <= totalDays; day++) {
//       allDates.push(new Date(year, month - 1, day));
//     }

//     // Step 3: Remove Saturdays and Sundays
//     const weekDays = allDates.filter((date) => {
//       const day = date.getDay();
//       return day !== 0 && day !== 6;
//     });

//     // Step 4: Get holidays from LeavePolicy
//     const leavePolicy = await LeavePolicyModel.findOne({});
//     const holidaysInMonth = (leavePolicy?.holidays || []).filter((holiday) => {
//       const holidayDate = new Date(holiday.date);
//       return (
//         holidayDate.getFullYear() === year &&
//         holidayDate.getMonth() === month - 1
//       );
//     });

//     // Step 5: Remove holidays from weekdays
//     const workingDays = weekDays.filter((date) => {
//       return !holidaysInMonth.some((holiday) => {
//         const holidayDate = new Date(holiday.date);
//         return (
//           holidayDate.getFullYear() === date.getFullYear() &&
//           holidayDate.getMonth() === date.getMonth() &&
//           holidayDate.getDate() === date.getDate()
//         );
//       });
//     });

//     // Step 6: Return result
//     return {
//       month,
//       year,
//       totalDays,
//       workingDaysCount: workingDays.length,
//       workingDates: workingDays,
//     };
//   } catch (error) {
//     console.error("Error in generateWorkingDays:", error);
//     throw error;
//   }
// };

// async function calculatePresentDays(
//   employeeId: string,
//   month: number,
//   year: number
// ) {
//   const start = new Date(year, month - 1, 1);
//   const end = new Date(year, month, 0);

//   // 1. Attendance records
//   const attendances = await AttendanceModel.find({
//     employee_id: employeeId,
//     date: { $gte: start, $lte: end },
//   });

//   // 2. Leave requests for the month
//   const leaveRequests = await LeaveRequestModel.find({
//     user: employeeId,
//     start_date: { $lte: end },
//     end_date: { $gte: start },
//     status: "approved",
//   });

//   // 3. Leave balance
//   const leaveBalance = await LeaveBalanceModel.findOne({
//     user_id: employeeId,
//     year,
//   });

//   let casualBalance = leaveBalance?.casual_balance ?? 0;
//   let sickBalance = leaveBalance?.sick_balance ?? 0;
//   let vacationBalance = leaveBalance?.vacation_balance ?? 0;

//   let fullDays = 0;
//   let halfDays = 0;
//   let paidLeaves = 0;
//   let unpaidLeaves = 0;
//   let absents = 0;

//   // Map leaveRequests by date
//   const leaveMap = new Map<string, string>(); // dateStr => type
//   for (const leave of leaveRequests) {
//     const curr = new Date(leave.start_date);
//     while (curr <= leave.end_date) {
//       const dateStr = curr.toISOString().split("T")[0];
//       leaveMap.set(dateStr, leave.type); // e.g. "casual"
//       curr.setDate(curr.getDate() + 1);
//     }
//   }

//   for (const att of attendances) {
//     const dateStr = att.date.toISOString().split("T")[0];
//     const status = att.status;
//     const hours = att.work_hours || 0;

//     if (status === "Present" && hours >= 8) {
//       fullDays++;
//     } else if (status === "Present" && hours >= 4) {
//       halfDays++;
//     } else if (status === "WFH") {
//       fullDays++;
//     } else if (status === "Leave") {
//       const leaveType = leaveMap.get(dateStr);
//       if (leaveType === "casual" && casualBalance > 0) {
//         casualBalance--;
//         paidLeaves++;
//       } else if (leaveType === "sick" && sickBalance > 0) {
//         sickBalance--;
//         paidLeaves++;
//       } else if (leaveType === "vacation" && vacationBalance > 0) {
//         vacationBalance--;
//         paidLeaves++;
//       } else {
//         unpaidLeaves++;
//       }
//     } else {
//       absents++;
//     }
//   }

//   return {
//     fullDays,
//     halfDays,
//     paidLeaves,
//     unpaidLeaves,
//     absents,
//     totalPresentDays: fullDays + halfDays * 0.5 + paidLeaves,
//   };
// }


// interface SalaryInputs {
//   employeeId: Schema.Types.ObjectId;
//   month: number;
//   year: number;
//   presentDays: number;
//   workingDays: number;
// }
// export const calculateNetSalary = async ({
//   employeeId,
//   month,
//   year,
//   presentDays,
//   workingDays,
// }: SalaryInputs) => {
//   // 1. Get Employee Salary Config
//   const salaryConfig = await EmployeeSalaryModel.findOne({
//     employee_id: employeeId,
//   });

//   if (!salaryConfig) {
//     throw new Error("Salary configuration not found for the employee.");
//   }

//   const { base_salary, bonuses, deductions } = salaryConfig;

//   // 2. Calculate per-day salary
//   const perDaySalary = base_salary / workingDays;

//   // 3. Calculate earned salary
//   const earnedSalary = perDaySalary * presentDays;

//   // 4. Final net salary
//   const netSalary = earnedSalary + (bonuses || 0) - (deductions|| 0);

//   return {
//     baseSalary: base_salary,
//     bonus: bonuses,
//     deductions,
//     netSalary: Math.round(netSalary), // Optional rounding
//     currency: salaryConfig.currency || "INR",
//   };
// };

const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const lastDayOfMonth = (y: number, m1to12: number) => new Date(y, m1to12, 0); // m=1..12


class PayrollController {
  // POST /generate/:employeeId
async  generatePayroll(req: Request, res: Response) {
  try {
    const employeeId = (req as any).user?.user?._id;
    if (!employeeId) return res.status(401).json({ message: "Unauthorized" });

    // month/year from query; defaults = current month/year
    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1; // 1..12
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    if (!(month >= 1 && month <= 12)) {
      return res.status(400).json({ message: "Invalid month (1-12)" });
    }

    // Range: month start → (today if current month) else last day of month
    const start = normalizeDate(new Date(year, month - 1, 1));
    const monthEnd = normalizeDate(lastDayOfMonth(year, month));
    const today = normalizeDate(new Date());
    const end =
      year === today.getFullYear() && month === today.getMonth() + 1 ? today : monthEnd;

    // Get active salary (latest effective_from ≤ end of period)
    const salaryCfg = await EmployeeSalaryModel.findOne({
      employee_id: employeeId,
      effective_from: { $lte: end },
    })
      .sort({ effective_from: -1 })
      .lean();

    if (!salaryCfg) {
      return res.status(404).json({ message: "No salary config found for employee" });
    }

    const baseSalary = Number(salaryCfg.base_salary || 0);

    // Fetch attendance in range
    const attendance = await AttendanceModel.find({
      employee_id: employeeId,
      date: { $gte: start, $lte: end },
    }).lean();

    const attnMap = new Map<string, any>();
    for (const a of attendance) {
      attnMap.set(normalizeDate(new Date(a.date)).toISOString(), a);
    }

    // Fetch holidays for that year & reduce to current range
    const policy = await LeavePolicyModel.findOne({ year }).lean();
    const holidaySet = new Set<string>();
    if (policy?.holidays?.length) {
      for (const h of policy.holidays) {
        const hd = normalizeDate(new Date(h.date));
        if (hd >= start && hd <= end) holidaySet.add(hd.toISOString());
      }
    }

    // Tally counters
    let workingDays = 0; // excludes weekends/holidays
    let fullDays = 0; // Present/Late
    let halfDays = 0; // Half-Day
    let earlyOutDays = 0; // Early-Out
    let absentDays = 0; // Absent

    // Iterate days in window
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const day = d.getDay(); // 0 Sun ... 6 Sat
      const key = normalizeDate(d).toISOString();

      // skip weekends & holidays from workingDays baseline
      if (day === 0 || day === 6) continue;
      if (holidaySet.has(key)) continue;

      workingDays++;

      const rec = attnMap.get(key);
      const status: string = rec?.status || "Absent";

      // Map statuses to pay buckets
      if (status === "Present" || status === "Late" || status === "WFH") {
        fullDays++;
      } else if (status === "Half-Day") {
        halfDays++;
      } else if (status === "Early-Out") {
        earlyOutDays++;
      } else if (status === "Absent") {
        absentDays++;
      } else {
        // Unknown/misc → treat as absent (defensive)
        absentDays++;
      }
    }

    // Avoid div-by-zero if month has 0 working days (all weekends/holidays)
    const dailySalary = workingDays > 0 ? baseSalary / workingDays : 0;

    // Payable day-equivalents
    const payableUnits = fullDays + 0.5 * halfDays + 0.5 * earlyOutDays;

    // Salary calculation (bonuses/deductions ignored for now)
    const gross = dailySalary * payableUnits;
    const bonus = 0;
    const deductions = 0;
    const netSalary = Math.round((gross + bonus - deductions) * 100) / 100;

    // Upsert payroll (employee + month + year)
    const payrollDoc = await payrollModel.findOneAndUpdate(
      { employee: employeeId, month, year },
      {
        employee: employeeId,
        month,
        year,
        workingDays,
        presentDays: fullDays, // full-day presents only
        paidLeaves: 0, // leaves later
        unpaidLeaves: absentDays,
        baseSalary,
        bonus,
        deductions,
        netSalary,
        status: "pending",
        generatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      message: "Payroll generated",
      payroll: payrollDoc,
      breakdown: {
        fullDays,
        halfDays,
        earlyOutDays,
        absentDays,
        payableUnits,
        dailySalary: Math.round(dailySalary * 100) / 100,
      },
      assumptions: {
        excludesWeekendsAndHolidaysFromWorkingDays: true,
        weekendOrHolidayAttendanceIgnoredForPay: true,
        leavesNotCountedYet: true,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error generating payroll" });
  }
}
}

export default new PayrollController();
