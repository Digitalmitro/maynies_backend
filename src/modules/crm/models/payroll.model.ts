import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },

  month: { type: Number, required: true },
  year: { type: Number, required: true },

  workingDays: { type: Number, required: true },
  presentDays: { type: Number, required: true },
  paidLeaves: { type: Number, default: 0 },
  unpaidLeaves: { type: Number, default: 0 },

  baseSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },

  leaveRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: "LeaveRequest" }],

  generatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ["pending", "paid"], default: "pending" },
});

export default mongoose.model("Payroll", payrollSchema);
