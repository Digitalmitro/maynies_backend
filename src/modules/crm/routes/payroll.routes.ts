// Generate payroll for an employee (for current month or custom range)

import { Response, Router, Request } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import payrollController from "../controllers/payroll.controller";
const router = Router();

router.post(
  "/generate/:employeeId",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    payrollController.generatePayroll(req, res);
  }
);

// // Get payroll for specific employee
// router.get(
//   "/:employeeId",
//   authenticate,
//   requireRole("employer"),
//   payrollController.getEmployeePayroll
// );

// // Get payroll by month/year for an employee
// router.get(
//   "/:employeeId/:year/:month",
//   authenticate,
//   requireRole("employer"),
//   payrollController.getPayrollByMonth
// );

// Get all payrolls
// router.get(
//   "/admin/all",
//   authenticate,
//   requireRole("admin"),
//   payrollController.getAllPayrolls
// );

// // Get payroll summary for all employees (filter by month/year)
// router.get(
//   "/admin/summary/:year/:month",
//   authenticate,
//   requireRole("admin"),
//   payrollController.getMonthlySummary
// );

// // Manually edit/update a payroll record (if needed)
// router.patch(
//   "/admin/update/:payrollId",
//   authenticate,
//   requireRole("admin"),
//   payrollController.updatePayroll
// );

// // Delete payroll record (only admin, rare case)
// router.delete(
//   "/admin/delete/:payrollId",
//   authenticate,
//   requireRole("admin"),
//   payrollController.deletePayroll
// );
