import { NextFunction, Request, Response, Router } from "express";
import { validate } from "../../../shared/middleware/validation";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { employerController } from "../controllers/employer.controller";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import { updateEmployeeSchema } from "../dtos/updateEmployeeProfile.dto";
import { SalaryUpdateSchema } from "../dtos/updateEmployeeSalary.dto";
import { attendence } from "../controllers/attendence.controller";

const router = Router();

// router.post("/mark", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.createUserAttendence(req, res) });
router.post(
  "/check-in",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    attendence.checkIn(req, res);
  }
);


router.post(
  "/check-out",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    attendence.checkOut(req, res);
  }
);
router.get(
  "/today",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    attendence.getToday(req, res);
  }
);
router.get(
  "/status",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    attendence.status(req, res);
  }
);

router.get(
  "/monthly",
  authenticate,
  requireRole("employer"),
    (req: Request, res: Response) => {
  attendence.getAllAttendances(req,res);
    }
);
// router.patch("/check-out", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.checkOut(req, res) });

// router.get("/:date", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.getMyAttendanceByDate(req, res) });

// router.get(
//     "/admin/all",
//     authenticate,
//     requireRole("admin"),
//     (req: Request, res: Response) => {
//         attendence.getAllAttendance(req, res);
//     }
// );

// 🛠 Attendance Routes (Main Table ke liye)

// POST /attendance/mark
// 👉 Ek din ke liye attendance mark karega (Present/Absent/Leave/Holiday, etc.).

// GET /attendance/:employeeId/:date
// 👉 Specific employee ka ek din ka attendance + uske sessions dega.

// GET /attendance/:employeeId
// 👉 Employee ka pura history (filters: month, year, status).

// PUT /attendance/:attendanceId
// 👉 Admin/HR attendance record update kar sake. (status change, notes add, approval).

// DELETE /attendance/:attendanceId
// 👉 Wrong entry delete karne ke liye.

// GET /attendance/report/monthly/:employeeId
// 👉 Specific month ka report generate.

// GET /attendance/report/company
// 👉 Company ya department wise summary (Present, Absent, WFH count).

// 🛠 Session Routes (Ek din ke andar multiple check-in/out)

// POST /attendance/:attendanceId/session/checkin
// 👉 Employee check-in karega. (IP, time capture hoga).

// PUT /attendance/:attendanceId/session/checkout/:sessionId
// 👉 Us session ka checkout hoga.

// GET /attendance/:attendanceId/sessions
// 👉 Ek din ke andar sab sessions ka list (break, multiple shifts).

// DELETE /attendance/:attendanceId/session/:sessionId
// 👉 Manual correction ke liye session delete.

// 🛠 Approval & Manual Adjustments

// PUT /attendance/:attendanceId/approve
// 👉 HR ya Manager approve kare (manual entry, leave, late reason).

// POST /attendance/manual
// 👉 Admin manually attendance add kare (agar system miss kare).

// 🛠 Analytics / Reports

// GET /attendance/stats/:employeeId
// 👉 Total Present, Absent, Leave, Overtime, etc.

// GET /attendance/stats/department/:deptId
// 👉 Department wise stats.

// GET /attendance/stats/company
// 👉 Company wide summary.

export default router;
