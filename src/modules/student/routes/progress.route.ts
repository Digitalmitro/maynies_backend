import { NextFunction } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import express, { Request, Response } from "express";
import progressController from "../controllers/progress.controller";
import { validate } from "../../../shared/middleware/validation";
import { GradeDto } from "../dtos/Grade.dto";
// src/modules/progress/progress.routes.js


const router = express.Router();

// Get list of all progress for current student

router.get(
    '/',
    authenticate,
    requireRole('student', "admin"),
    (req: Request, res: Response, next: NextFunction) => { progressController.listProgress(req, res, next) }
);
router.get(
    '/all',
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response, next: NextFunction) => { progressController.studentProgressList(req, res, next) }
);
router.get(
    '/:studentId',
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response, next: NextFunction) => { progressController.studentProgressListById(req, res, next) }
);


router.post(
    '/:courseId/:studentId/grade',
    authenticate,
    requireRole('faculty', 'admin'),
    validate(GradeDto),
    (req: Request, res: Response, next: NextFunction) => { progressController.addGrade(req, res, next) }
);
// // Get detailed progress for one course
// router.get(
//   '/:courseId',
//   authenticate,
//   requireRole('student'),
//   (req, res, next) => progressController.getCourseProgress(req, res, next)
// );

// // Record assignment submission (student)
// router.post(
//   '/:courseId/assignment',
//   authenticate,
//   requireRole('student'),
//   validate(AssignmentDto),
//   (req, res, next) => progressController.addAssignment(req, res, next)
// );

// // Record or update final grade (faculty/admin)
// router.post(
//   '/:courseId/grade',
//   authenticate,
//   requireRole('faculty', 'admin'),
//   validate(GradeDto),
//   (req, res, next) => progressController.addGrade(req, res, next)
// );

// // Get GPA snapshots for current student
// router.get(
//   '/gpa',
//   authenticate,
//   requireRole('student'),
//   (req, res, next) => progressController.listGpaSnapshots(req, res, next)
// );

// // Generate & download PDF transcript for current student
// router.get(
//   '/report',
//   authenticate,
//   requireRole('student'),
//   (req, res, next) => progressController.downloadTranscript(req, res, next)
// );


export default router;
