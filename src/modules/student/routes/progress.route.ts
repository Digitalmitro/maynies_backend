import { NextFunction } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import express, { Request, Response } from "express";
import progressController from "../controllers/progress.controller";
import { validate } from "../../../shared/middleware/validation";
import { GradeDto } from "../dtos/grade.dto";
// src/modules/progress/progress.routes.js


const router = express.Router();

// Get list of all progress for current student

router.get(
    '/',
    authenticate,
    requireRole('student'),
    (req: Request, res: Response, next: NextFunction) =>
        progressController.listOwnProgress(req, res, next)
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
    requireRole('admin'),
    validate(GradeDto),
    (req: Request, res: Response, next: NextFunction) => { progressController.addGrade(req, res, next) }
);



export default router;


