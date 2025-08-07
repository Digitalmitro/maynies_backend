import { Request, Response } from "express";
import PayrollModel from "../models/payroll.model";
import { EmployeeProfileModel } from "../models/employer.model";
import { EmployeeSalaryModel } from "../models/emploeeSalary.model";
import { AttendanceModel, AttendanceStatus } from "../models/attendence.model";
import { LeaveRequestModel } from "../models/leaveRequest.model";
import { LeavePolicyModel } from "../models/leavePolicy.model";
import { Schema } from "mongoose";
import { LeaveBalanceModel } from "../models/leaveBalance.model";
// import AttendanceModel from "../models/attendance.model";
// import SalaryModel from "../models/salary.model";
// import LeaveRequestModel from "../models/leaveRequest.model";
// import EmployeeModel from "../models/employee.model";

const generateWorkingDays = async (month: number, year: number) => {
  try {
    // Step 1: Total days in month
    const totalDays = new Date(year, month, 0).getDate();

    // Step 2: Create all dates in the month
    const allDates = [];
    for (let day = 1; day <= totalDays; day++) {
      allDates.push(new Date(year, month - 1, day));
    }

    // Step 3: Remove Saturdays and Sundays
    const weekDays = allDates.filter((date) => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    });

    // Step 4: Get holidays from LeavePolicy
    const leavePolicy = await LeavePolicyModel.findOne({});
    const holidaysInMonth = (leavePolicy?.holidays || []).filter((holiday) => {
      const holidayDate = new Date(holiday.date);
      return (
        holidayDate.getFullYear() === year &&
        holidayDate.getMonth() === month - 1
      );
    });

    // Step 5: Remove holidays from weekdays
    const workingDays = weekDays.filter((date) => {
      return !holidaysInMonth.some((holiday) => {
        const holidayDate = new Date(holiday.date);
        return (
          holidayDate.getFullYear() === date.getFullYear() &&
          holidayDate.getMonth() === date.getMonth() &&
          holidayDate.getDate() === date.getDate()
        );
      });
    });

    // Step 6: Return result
    return {
      month,
      year,
      totalDays,
      workingDaysCount: workingDays.length,
      workingDates: workingDays,
    };
  } catch (error) {
    console.error("Error in generateWorkingDays:", error);
    throw error;
  }
};

async function calculatePresentDays(
  employeeId: string,
  month: number,
  year: number
) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  // 1. Attendance records
  const attendances = await AttendanceModel.find({
    employee_id: employeeId,
    date: { $gte: start, $lte: end },
  });

  // 2. Leave requests for the month
  const leaveRequests = await LeaveRequestModel.find({
    user: employeeId,
    start_date: { $lte: end },
    end_date: { $gte: start },
    status: "approved",
  });

  // 3. Leave balance
  const leaveBalance = await LeaveBalanceModel.findOne({
    user_id: employeeId,
    year,
  });

  let casualBalance = leaveBalance?.casual_balance ?? 0;
  let sickBalance = leaveBalance?.sick_balance ?? 0;
  let vacationBalance = leaveBalance?.vacation_balance ?? 0;

  let fullDays = 0;
  let halfDays = 0;
  let paidLeaves = 0;
  let unpaidLeaves = 0;
  let absents = 0;

  // Map leaveRequests by date
  const leaveMap = new Map<string, string>(); // dateStr => type
  for (const leave of leaveRequests) {
    const curr = new Date(leave.start_date);
    while (curr <= leave.end_date) {
      const dateStr = curr.toISOString().split("T")[0];
      leaveMap.set(dateStr, leave.type); // e.g. "casual"
      curr.setDate(curr.getDate() + 1);
    }
  }

  for (const att of attendances) {
    const dateStr = att.date.toISOString().split("T")[0];
    const status = att.status;
    const hours = att.work_hours || 0;

    if (status === "Present" && hours >= 8) {
      fullDays++;
    } else if (status === "Present" && hours >= 4) {
      halfDays++;
    } else if (status === "WFH") {
      fullDays++;
    } else if (status === "Leave") {
      const leaveType = leaveMap.get(dateStr);
      if (leaveType === "casual" && casualBalance > 0) {
        casualBalance--;
        paidLeaves++;
      } else if (leaveType === "sick" && sickBalance > 0) {
        sickBalance--;
        paidLeaves++;
      } else if (leaveType === "vacation" && vacationBalance > 0) {
        vacationBalance--;
        paidLeaves++;
      } else {
        unpaidLeaves++;
      }
    } else {
      absents++;
    }
  }

  return {
    fullDays,
    halfDays,
    paidLeaves,
    unpaidLeaves,
    absents,
    totalPresentDays: fullDays + halfDays * 0.5 + paidLeaves,
  };
}


interface SalaryInputs {
  employeeId: Schema.Types.ObjectId;
  month: number;
  year: number;
  presentDays: number;
  workingDays: number;
}
export const calculateNetSalary = async ({
  employeeId,
  month,
  year,
  presentDays,
  workingDays,
}: SalaryInputs) => {
  // 1. Get Employee Salary Config
  const salaryConfig = await EmployeeSalaryModel.findOne({
    employee_id: employeeId,
  });

  if (!salaryConfig) {
    throw new Error("Salary configuration not found for the employee.");
  }

  const { base_salary, bonuses, deductions } = salaryConfig;

  // 2. Calculate per-day salary
  const perDaySalary = base_salary / workingDays;

  // 3. Calculate earned salary
  const earnedSalary = perDaySalary * presentDays;

  // 4. Final net salary
  const netSalary = earnedSalary + (bonuses || 0) - (deductions|| 0);

  return {
    baseSalary: base_salary,
    bonus: bonuses,
    deductions,
    netSalary: Math.round(netSalary), // Optional rounding
    currency: salaryConfig.currency || "INR",
  };
};


class PayrollController {
  // POST /generate/:employeeId
  async generatePayroll(req: Request, res: Response) {
    try {
      const employeeId = req.user?.user?._id;
      const { month, year } = req.query as { month: string; year: string };

      const requestedMonth = Number(month);
      const requestedYear = Number(year);

      // Make sure month is valid
      if (requestedMonth < 1 || requestedMonth > 12) {
        return res.status(400).json({ error: "Invalid month value" });
      }

      // Construct the requested date as the **last day of that month**
      const requestedDate = new Date(requestedYear, requestedMonth, 0); // 0th day of next month = last day of requestedMonth
      const today = new Date();

      // Payroll allowed only for past months (not current or future)
      if (requestedDate >= today) {
        return res.status(400).json({
          error:
            "Payroll for the current or future month can't be generated yet.",
        });
      }

      // Calculate working days
      const workingDaysData = await generateWorkingDays(
        requestedMonth,
        requestedYear
      );
      const presentInfo = await calculatePresentDays(
        employeeId,
        requestedMonth,
        requestedYear
      );

      const salaryDetails = await calculateNetSalary({
        employeeId,
        month: requestedMonth,
        year: requestedYear,
        presentDays: presentInfo?.totalPresentDays,
        workingDays: workingDaysData.workingDaysCount,
      });
      const payroll = {
        employeeId,
        month: requestedMonth,
        year: requestedYear,
        workingDays: workingDaysData.workingDaysCount,
        presentDays: presentInfo.totalPresentDays,
        absent: presentInfo.absents,
        paidLeaves: presentInfo.paidLeaves,
        unpaidLeaves: presentInfo.unpaidLeaves,
        ...salaryDetails,

      };

      res.status(200).json({
        message: "Payroll calculation preview",
        payroll,
      });
    } catch (error) {
      console.error("Error generating payroll:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new PayrollController();
