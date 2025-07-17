// src/modules/auth/routes/auth.routes.ts

import { NextFunction, Request, Response, Router } from 'express';
import { validate } from '../../../shared/middleware/validation';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { employerController } from '../controllers/employer.controller';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { updateEmployerProfileSchema } from '../dtos/employerProfile';

const router = Router();



router.get("/", authenticate, requireRole("employee"), (req: Request, res: Response, next: NextFunction) => { employerController.getMyProfile });

// router.put("/employee/profile", authorize(["employee"]), EmployeeProfileController.updateMyProfile);

// // 👑 Admin Routes
// router.get("/admin/employees", authorize(["admin"]), EmployeeProfileController.getAllProfiles);
// router.get("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.getProfileById);
// router.put("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.updateProfileById);
// router.delete("/admin/employees/:id", authorize(["admin"]), EmployeeProfileController.deleteProfileById);


export default router;
