// src/modules/student/routes/admission.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import { admissionController } from "../controllers/admission.controller";

import { CreateAdmissionSchema } from "../dtos/createAdmission.dto";
import { validate } from "../../../shared/middleware/validation";
import { UpdateAdmissionSchema } from "../dtos/updateAdmission.dto";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import { UpdateAdmissionStatusSchema } from "../dtos/updateAdmissionStatus.dto";
import { planController } from "../controllers/plans.controller";
import { CreatePlanDto, CreatePlanSchema } from "../dtos/createPlan.dto";
import { ZodSchema } from "zod";
import { CreateStudentPlanSchema } from "../dtos/CreateStudentPlan.dto";

const router = Router();
// Protect all routes: only students
// router.use(authenticate);

// Fetch full application

// admin routes
router.post(
  "/admin",
  authenticate,
  requireRole("admin"),
  validate(CreatePlanSchema as unknown as ZodSchema<CreatePlanDto>),
  (req: Request, res: Response, next: NextFunction) => {
    planController.createPlan(req, res, next);
  }
);

router.get(
  "/admin",
  authenticate,
  requireRole("admin"), // Only admin role can access
  (req: Request, res: Response, next: NextFunction) => {
    planController.getPlansForAdmin(req, res, next);
  }
);

router.post(
  "/",
  authenticate,
  requireRole("student"),
  validate(CreateStudentPlanSchema),
  (req: Request, res: Response, next: NextFunction) => {
    console.log("Creating student plan...");
    res.status(200).json({
      message: "Student plan creation endpoint hit successfully",
    });
  }
);

// router.post('/', authenticate, requireRole('student'), validate(CreateAdmissionSchema), (req, res, next) => { admissionController.createAdmission(req, res, next) });

// router.get('/all', authenticate, requireRole('admin'), (req, res, next) => { admissionController.getAllApplication(req, res, next) });
// Fetch only status
// router.get('/status', (req, res, next) => { admissionController.getStatus(req, res, next) });
// Create or update (re-apply) admission
// router.post('/', authenticate, requireRole('student'), validate(CreateAdmissionSchema), (req, res, next) => { admissionController.createAdmission(req, res, next) });
// router.patch('/', authenticate, requireRole('student'), validate(UpdateAdmissionSchema), (req, res, next) => { admissionController.updateAdmission(req, res, next) });
// Add a document reference

// router.patch(
//     '/:admissionId/status',
//     authenticate, requireRole('admin'),
//     validate(UpdateAdmissionStatusSchema),
//     (req, res, next) => { admissionController.updateStatus(req, res, next) }
// )
// Restore a soft-deleted document

export default router;
