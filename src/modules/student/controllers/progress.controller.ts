import { NextFunction, Request, Response } from "express";
import { ProgressModel } from "../models/progress.model";
import { GradeInput } from "../dtos/Grade.dto";
import { CourseEnrollmentModel } from "../../courses/models/courseEnrollment.model";
import { Types } from "mongoose";
import { CourseModel } from "../../courses/models/course.model";

// src/modules/progress/progress.controller.js

class ProgressController {



    async listProgress(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            // Fetch all progress entries for this user
            const progressList = await ProgressModel.find({ userId })
                .populate('courseId', 'title credits')
                .lean();

            return res.status(200).json({ success: true, data: progressList });
        } catch (err) {
            next(err);
        }
    }

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


    async addGrade(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { courseId, studentId } = req.params;
            const { score, grade } = req.body;

            // 1) Ensure the student is actually enrolled in this course
            const enrollment = await CourseEnrollmentModel.findOne({
                course_id: new Types.ObjectId(courseId),
                student_id: new Types.ObjectId(studentId),
                access_granted: true
            });
            if (!enrollment) {
                return res
                    .status(403)
                    .json({ success: false, message: 'Student not enrolled in this course' });
            }

            const course = await CourseModel.findById(courseId).lean();
            if (!course) {
                return res.status(404).json({ success: false, message: 'Course not found' });
            }

            // 2) Upsert the progress record for that student & course
            const updated = await ProgressModel.findOneAndUpdate(
                { userId: new Types.ObjectId(studentId), courseId: new Types.ObjectId(courseId) },
                {
                    $set: {
                        courseGrade: { score, grade, computedAt: new Date() },
                        completedAt: new Date(),
                        credits: course.credits,
                    }
                },
                { new: true, upsert: true }
            ).lean();

            return res.status(200).json({ success: true, data: updated });
        } catch (err) {
            next(err);
        }
    }

}


export default new ProgressController();