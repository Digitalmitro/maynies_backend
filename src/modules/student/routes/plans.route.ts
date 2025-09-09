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
import {  CreatePlanSchema } from "../dtos/createPlan.dto";
import { ZodSchema } from "zod";
import { CreateStudentPlanSchema } from "../dtos/studentEnrollPlan.dto";
import { createOfflinePaymentSchema } from "../dtos/studentPaymentRequest.dto";
import { GetPlansQueryDTO } from "../dtos/getPlan.dto";
import { updatePlanSchema } from "../dtos/updatePlan.dto";

const router = Router();
// Protect all routes: only students
// router.use(authenticate);

// Fetch full application

// admin routes
router.post(
  "/admin",
  authenticate,
  requireRole("admin"),
  validate(CreatePlanSchema),
  (req: Request, res: Response) => {
    planController.createPlan(req, res);
  }
);

router.get(
  "/admin",
  authenticate,
  requireRole("admin"), // Only admin role can access
  validate(GetPlansQueryDTO as any, "query"),
  (req: Request, res: Response) => {
    planController.getPlans(req, res);
  }
);

router.get(
  "/admin/:id",
  authenticate,
  requireRole("admin"), // Only admin role can access
  (req: Request, res: Response) => {
    planController.getPlanDetailById(req, res);
  }
);

router.put(
  "/admin/:id",
  authenticate,
  requireRole("admin"), // Only admin role can access
  validate(updatePlanSchema),
  (req: Request, res: Response) => {
    planController.updatePlan(req, res);
  }
);

router.delete(
  "/admin/:id",
  authenticate,
  requireRole("admin"), // Only admin role can access
  (req: Request, res: Response) => {
    planController.deletePlan(req, res);
  }
);

router.get(
  "/admin/enrollments/:planId",
  authenticate,
  requireRole("admin"), // Only admin role can access
  (req: Request, res: Response) => {
    planController.getEnrollmentsByPlanId(req, res);
  }
);

router.patch(
  "/admin/enrollments/:id/status",
  authenticate,
  requireRole("admin"), // Only admin role can access
  (req: Request, res: Response) => {
    planController.updateEnrollmentStatus(req, res);
  }
);






// router.get(
//   "/admin/:id",
//   authenticate,
//   requireRole("admin"), // Only admin role can access
//   (req: Request, res: Response, next: NextFunction) => {
//     planController.getPlanDetail(req, res, next);
//   }
// );

router.post(
  "/enroll",
  authenticate,
  requireRole("student"), // Only admin role can access
  (req: Request, res: Response) => {
    planController.studentEnrollPlan(req, res);
  }
);

// router.get(
//   "/admin/requests",
//   authenticate,
//   requireRole("admin"), // Only admin role can access
//   (req: Request, res: Response) => {
//     planController.getAllRequests(req, res);
//   }
// );
// router.put(
//   "/admin/requests/:id",
//   authenticate,
//   requireRole("admin"), // Only admin role can access
//   (req: Request, res: Response) => {
//     planController.updatePaymentRequestStatus(req, res);
//   }
// );

// // student routes
// router.get(
//   "/enrollments/:studentId",
//   authenticate,
//   requireRole("admin", "student"),
//   (req: Request, res: Response, next: NextFunction) => {
//     planController.getEnrollmentPlans(req, res, next);
//   }
// );

router.get(
  "/",
  authenticate,
  requireRole("student"),
  // validate(CreateStudentPlanSchema),
  (req: Request, res: Response, next: NextFunction) => {
    planController.getPlansForStudent(req, res, next);
  }
);

router.get(
  "/:id",
  authenticate,
  requireRole("student"),
  // validate(CreateStudentPlanSchema),
  (req: Request, res: Response, next: NextFunction) => {
    planController.planDetailForStudent(req, res, next);
  }
);

// router.get(
//   "/planenrollments/:id",
//   authenticate,
//   requireRole("student"),
//   // validate(CreateStudentPlanSchema),
//   (req: Request, res: Response, next: NextFunction) => {
//     planController.enrollmentPlanDetailForStudent(req, res, next);
//   }
// );

// router.post(
//   "/",
//   authenticate,
//   requireRole("student"),
//   validate(CreateStudentPlanSchema),
//   (req: Request, res: Response, next: NextFunction) => {
//     planController.createStudentPlan(req, res, next);
//   }
// );

// router.post(
//   "/payment/offline",
//   authenticate,
//   requireRole("student"),
//   validate(createOfflinePaymentSchema),
//   (req: Request, res: Response) => {
//     planController.createOfflnePayment(req, res);
//   }
// );

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
