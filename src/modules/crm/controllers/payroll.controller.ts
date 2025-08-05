import { Request, Response } from "express";
import PayrollModel from "../models/payroll.model";
import AttendanceModel from "../models/attendance.model";
import SalaryModel from "../models/salary.model";
import LeaveRequestModel from "../models/leaveRequest.model";
import EmployeeModel from "../models/employee.model";

class PayrollController {
  // POST /generate/:employeeId
  async generatePayroll(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const currentDate = new Date();
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-indexed

      // Step 1: Get Employee
      const employee = await EmployeeModel.findById(employeeId);
      if (!employee) return res.status(404).json({ error: "Employee not found" });

      // Step 2: Get Fixed Salary
      const salaryData = await SalaryModel.findOne({ employee: employeeId });
      if (!salaryData) return res.status(404).json({ error: "Salary details not found" });

      const baseSalary = salaryData.amount;

      // Step 3: Get Attendance for this month
      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0);

      const attendances = await AttendanceModel.find({
        employee: employeeId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });

      const presentDays = attendances.filter(a => a.status === "present").length;
      const totalWorkingDays = attendances.length;

      // Step 4: Get Approved Paid Leaves
      const leaves = await LeaveRequestModel.find({
        employee: employeeId,
        status: "approved",
        type: "paid",
        fromDate: { $lte: endOfMonth },
        toDate: { $gte: startOfMonth },
      });

      let paidLeaveDays = 0;
      leaves.forEach(leave => {
        const from = new Date(leave.fromDate);
        const to = new Date(leave.toDate);
        const days = Math.ceil((Math.min(to, endOfMonth).getTime() - Math.max(from, startOfMonth).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        paidLeaveDays += days;
      });

      const effectivePresentDays = presentDays + paidLeaveDays;
      const perDaySalary = baseSalary / totalWorkingDays;
      const finalSalary = Math.round(effectivePresentDays * perDaySalary);

      // Step 5: Create Payroll Entry
      const newPayroll = await PayrollModel.create({
        employee: employeeId,
        month,
        year,
        baseSalary,
        presentDays,
        paidLeaves: paidLeaveDays,
        totalWorkingDays,
        finalSalary,
        generatedAt: new Date(),
      });

      res.status(201).json({ message: "Payroll generated", payroll: newPayroll });

    } catch (error) {
      console.error("Payroll generation error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default new PayrollController();
