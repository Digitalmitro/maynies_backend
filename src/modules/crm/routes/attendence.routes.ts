
import { NextFunction, Request, Response, Router } from 'express';
import { validate } from '../../../shared/middleware/validation';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { employerController } from '../controllers/employer.controller';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { updateEmployeeSchema } from '../dtos/updateEmployeeProfile.dto';
import { SalaryUpdateSchema } from '../dtos/updateEmployeeSalary.dto';
import { attendence } from '../controllers/attendence.controller';

const router = Router();



// router.get("/", authenticate,
//     requireRole("employer"),
//     (req: Request, res: Response) => {
//         employerController.getMyProfile(req, res)
//     });



// router.put("/", authenticate,
//     requireRole("employer"),
//     validate(updateEmployeeSchema),
//     (req: Request, res: Response) => {
//         employerController.updateMyProfile(req, res)
//     });

// router.patch(
//     "/admin/salary/:employeeId",
//     authenticate,
//     requireRole("admin"),
//     validate(SalaryUpdateSchema),
//     (req: Request, res: Response) => { employerController.updateEmployeeSalary(req, res) }
// );

// // // 👑 Admin Routes
// router.get("/admin/employees",
//     authenticate,
//     requireRole("admin"),
//     (req: Request, res: Response) => { employerController.getAllEmployee(req, res) });


// router.get("/admin/employees/:id",
//     authenticate,
//     requireRole("admin"),
//     (req: Request, res: Response) => { employerController.getEmployeeById(req, res) });

// routes/attendance.routes.ts

router.post("/check-in", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.checkIn(req, res) });

router.patch("/check-out", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.checkOut(req, res) });

router.get("/", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.getMyAttendance(req, res) });


router.get("/:date", authenticate, requireRole("employer"), (req: Request, res: Response) => { attendence.getMyAttendanceByDate(req, res) });



router.get(
    "/admin/all",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => {
        attendence.getAllAttendance(req, res);
    }
);


// routes/admin/attendance.routes.ts
// router.get("/", authorize(["admin"]), AdminAttendanceController.getAll);
// router.get("/:id", authorize(["admin"]), AdminAttendanceController.getByEmployeeId);
// router.post("/mark", authorize(["admin"]), AdminAttendanceController.markAttendance);
// router.patch("/:recordId", authorize(["admin"]), AdminAttendanceController.update);
// router.delete("/:recordId", authorize(["admin"]), AdminAttendanceController.remove);

// Route	Purpose
// GET /admin/attendance	Get all attendance with filters
// GET /admin/attendance/:id	Get single employee’s history
// GET /admin/attendance/:id/:date	Get employee attendance on specific date
// POST /admin/attendance/manual	Manually mark attendance
// PATCH /admin/attendance/:id	Edit/update attendance
// DELETE /admin/attendance/:id	Delete a record (optional)
// GET /admin/attendance-summary







export default router;
