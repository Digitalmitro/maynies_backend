import { NextFunction, Request, Response } from "express";
import { ProgressModel } from "../models/progress.model";
import { CourseEnrollmentModel } from "../../courses/models/courseEnrollment.model";
import { Types } from "mongoose";
import { BaseError } from "../../../shared/utils/baseError";

// src/modules/progress/progress.controller.js

class ProgressController {



    async listOwnProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.user!.user._id; // ya jahan se token middleware userId set karta hai

            // Fetch all progress entries for this student, populate course info
            const progressList = await ProgressModel.find({ studentId: userId })
                .populate('courseId', 'title credits')
                .sort({ updatedAt: -1 })
                .lean();

            // Map into frontend-friendly shape
            const data = progressList.map(p => ({
                courseId: p.courseId._id,
                title: (p.courseId as any).title,
                credits: (p.courseId as any).credits,
                grade: p.grade,
                gpa: p.gpa,
                progressPercent: p.progressPercent,
                isCompleted: p.progressPercent === 100 || !!p.completedAt,
                // updatedAt: p.updatedAt
            }));

            res.status(200).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

    async studentProgressListById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.params?.studentId;
            // Fetch all progress entries for this user
            const progressList = await ProgressModel.find({ userId })
                .populate('courseId', 'title credits')
                .lean();

            return res.status(200).json({ success: true, data: progressList });
        } catch (err) {
            next(err);
        }
    }

    async studentProgressList(req: Request, res: Response, next: NextFunction) {
        try {
            // const userId = req?.params?.studentId;
            // Fetch all progress entries for this user
            const progressList = await ProgressModel.find()
                .populate('courseId', 'title credits')
                .lean();

            return res.status(200).json({ success: true, data: progressList });
        } catch (err) {
            next(err);
        }
    }

    // async addAssignment(req: Request, res: Response, next: NextFunction) {
    //     try {
    //         const userId = req.user.id;
    //         const { courseId } = req.params;
    //         const { assignmentId, score, maxScore } = req.body; // validated

    //         // Ensure student is enrolled and has access
    //         const enrollment = await CourseEnrollmentModel.findOne({
    //             course_id: new Types.ObjectId(courseId),
    //             student_id: new Types.ObjectId(userId),
    //             access_granted: true
    //         });
    //         if (!enrollment) {
    //             return res.status(403).json({ success: false, message: 'Not enrolled in this course' });
    //         }

    //         // Append assignment
    //         const updated = await ProgressModel.findOneAndUpdate(
    //             { userId, courseId },
    //             { $push: { assignments: { assignmentId, score, maxScore, submittedAt: new Date() } } },
    //             { new: true, upsert: true }
    //         ).lean();

    //         return res.status(201).json({ success: true, data: updated });
    //     } catch (err) {
    //         next(err);
    //     }
    // }


    async addGrade(req: Request, res: Response, next: NextFunction) {
        try {
            const { courseId, studentId } = req.params;
            const { grade, gpa, progressPercent, credits } = req.body;

            // 1. Validate IDs
            if (!Types.ObjectId.isValid(courseId) || !Types.ObjectId.isValid(studentId)) {
                throw new BaseError('Invalid courseId or studentId', 400);
            }

            // 2. Check enrollment
            const enrolled = await CourseEnrollmentModel.findOne({
                course_id: courseId,
                student_id: studentId,
                is_deleted: false
            }).lean();
            if (!enrolled) {
                throw new BaseError('Student is not enrolled in this course', 404);
            }

            // 3. Upsert the Progress record
            const filter = {
                courseId: new Types.ObjectId(courseId),
                studentId: new Types.ObjectId(studentId)
            };
            const update: any = {
                grade,
                gpa,
                progressPercent,
                credits
            };
            // manage completedAt
            if (progressPercent === 100) update.completedAt = new Date();
            else update.completedAt = null;

            const options = {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true
            };

            const progress = await ProgressModel
                .findOneAndUpdate(filter, update, options)
                .lean()
                .exec();

            // 4. Return
            res.status(200).json({ success: true, data: progress });
        } catch (err) {
            next(err);
        }
    };


}


export default new ProgressController();