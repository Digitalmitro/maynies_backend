import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/course.services';
import { CreateCourseDto } from '../dtos/createCourse.dto';
import { UpdateCourseDto } from '../dtos/updateCourse.dto';
import { AddToCartDto } from '../dtos/addToCart.dto';
import { BaseError } from '../../../shared/utils/baseError';
import { CourseModel } from '../models/course.model';
import { UserModel } from '../../user/models/user.modal';
import { UserProfileModel } from '../../user/models/userProfile.model';
import { ProgressModel } from '../../student/models/progress.model';
import { CourseEnrollmentModel } from '../models/courseEnrollment.model';
import { Types } from 'mongoose';

export class CourseController {

    constructor(private readonly courseService: CourseService) { }

    async createCourse(req: Request, res: Response, next: NextFunction) {
        try {
            const input = req.body as CreateCourseDto;
            const userId = req?.user?.user._id;

            const course = await this.courseService.createCourse(input, userId);
            res.status(201).json({ message: 'Course created successfully', data: course });
        } catch (err) {
            next(err);
        }
    }

    async getAllCourses(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await this.courseService.getAllCourses(req.query);
            res.status(200).json({
                message: 'Courses fetched successfully',
                data
            });
        } catch (err) {
            next(err);
        }
    }

    async getCourseBySlug(req: Request, res: Response, next: NextFunction) {
        try {
            const { slug } = req.params;
            const userId = req?.user?.user?._id;

            console.log(`Fetching course by slug: ${slug} for user: ${userId}`);
            const course = await this.courseService.getCourseBySlug(slug, userId);
            res.status(200).json({ message: 'Course detail fetched', data: course });
        } catch (err) {
            next(err);
        }
    }

    async updateCourse(req: Request, res: Response, next: NextFunction) {
        try {
            const courseId = req.params.id;
            const input = req.body as UpdateCourseDto;
            const userId = req?.user?.user?._id;

            const updated = await this.courseService.updateCourse(courseId, input, userId);
            res.status(200).json({ message: 'Course updated successfully', data: updated });
        } catch (err) {
            next(err);
        }
    }

    async deleteCourse(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            await this.courseService.softDeleteCourse(id);
            res.status(200).json({ message: 'Course deleted successfully (soft delete)' });
        } catch (err) {
            next(err);
        }
    }

    async addToCart(req: Request, res: Response, next: NextFunction) {
        try {
            const input = req.body as AddToCartDto;
            const studentId = req.user?.user?._id;

            const item = await this.courseService.addToCart(input, studentId);
            res.status(201).json({ message: 'Added to cart', data: item });
        } catch (err) {
            next(err);
        }
    }
    async getCart(req: Request, res: Response, next: NextFunction) {
        try {
            const studentId = req.user?.user?._id;
            const items = await this.courseService.getCartItems(studentId);
            res.json({ message: 'Cart fetched', data: items });
        } catch (err) {
            next(err);
        }
    }

    async removeCart(req: Request, res: Response, next: NextFunction) {
        try {
            const courseId = req.params.courseId;
            const studentId = req.user?.user?._id;

            const removed = await this.courseService.removeFromCart(courseId, studentId);
            res.json({ message: 'Course removed from cart', data: removed });
        } catch (err) {
            next(err);
        }
    }

    async listEnrollmentsByCourseId(
        req: Request,
        res: Response,
        next: NextFunction
    ) {
        try {
            const { courseId } = req.params;

            // 1. Validate courseId
            if (!Types.ObjectId.isValid(courseId)) {
                throw new BaseError('Invalid courseId', 400);
            }

            // 2. Ensure course exists
            const course = await CourseModel.findById(courseId).lean();
            if (!course) {
                throw new BaseError('Course not found', 404);
            }

            // 3. Fetch enrollments
            const enrollments = await CourseEnrollmentModel.find({
                course_id: course._id,
                is_deleted: false
            })
                .select('student_id payment_status access_granted')
                .lean();

            const studentIds = enrollments.map(e => e.student_id);

            // 4. Fetch user basic info (email), profiles (name) and progress
            const [users, profiles, progresses] = await Promise.all([
                UserModel.find({ _id: { $in: studentIds } })
                    .select('email')
                    .lean(),
                UserProfileModel.find({ user_id: { $in: studentIds } })
                    .select('user_id first_name last_name avatar_url')
                    .lean(),
                ProgressModel.find({
                    courseId: course._id,
                    studentId: { $in: studentIds }
                })
                    .select('studentId grade gpa progressPercent')
                    .lean()
            ]);

            // 5. Build lookup maps
            const userMap = new Map(users.map(u => [u._id.toString(), u]));
            const profileMap = new Map(
                profiles.map(p => [p.user_id.toString(), p])
            );
            const progressMap = new Map(
                progresses.map(p => [p.studentId.toString(), p])
            );

            // 6. Assemble response array
            const data = enrollments.map(e => {
                const sid = e.student_id.toString();
                const user = userMap.get(sid) || { email: '' };
                const prof = profileMap.get(sid) || { first_name: '', last_name: '' };
                const prog = progressMap.get(sid) || {
                    grade: '_',
                    gpa: null,
                    progressPercent: null
                };

                return {
                    studentId: sid,
                    name: `${prof.first_name} ${prof.last_name}`.trim() || user.email,
                    email: user.email,
                    paymentStatus: e.payment_status,
                    accessGranted: e.access_granted,
                    grade: prog.grade,
                    gpa: prog.gpa,
                    progressPercent: prog.progressPercent
                };
            });

            // 7. Return sorted list (optional: by name)
            data.sort((a, b) => a.name.localeCompare(b.name));

            res.status(200).json({ success: true, data });
        } catch (err) {
            next(err);
        }
    };

}


const courseService = new CourseService();
export const courseController = new CourseController(courseService);
