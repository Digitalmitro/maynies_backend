// src/modules/auth/routes/auth.routes.ts

import { NextFunction, Request, Response, Router } from 'express';
import { validate } from '../../../shared/middleware/validation';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { employerController } from '../controllers/employer.controller';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { updateEmployeeSchema } from '../dtos/updateEmployeeProfile.dto';
import { SalaryUpdateSchema } from '../dtos/updateEmployeeSalary.dto';

const router = Router();



router.get("/", authenticate,
    requireRole("employer"),
    (req: Request, res: Response) => {
        employerController.getMyProfile(req, res)
    });



router.put("/", authenticate,
    requireRole("employer"),
    validate(updateEmployeeSchema),
    (req: Request, res: Response) => {
        employerController.updateMyProfile(req, res)
    });

router.patch(
    "/admin/salary/:employeeId",
    authenticate,
    requireRole("admin"),
    validate(SalaryUpdateSchema),
    (req: Request, res: Response) => { employerController.updateEmployeeSalary(req, res) }
);

// // 👑 Admin Routes
router.get("/admin/employees",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => { employerController.getAllProfiles(req, res) });


router.get("/admin/employees/:id",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => { employerController.getEmployeeById(req, res) });


// router.get("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.getProfileById);
// router.put("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.updateProfileById);
// router.delete("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.deleteProfileById);


export default router;
