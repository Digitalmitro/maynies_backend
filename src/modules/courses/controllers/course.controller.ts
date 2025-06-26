import { Request, Response, NextFunction } from 'express';
import { CourseService } from '../services/course.services';
import { CreateCourseDto } from '../dtos/createCourse.dto';
import { UpdateCourseDto } from '../dtos/updateCourse.dto';

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
            const course = await this.courseService.getCourseBySlug(slug);
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
}


const courseService = new CourseService();
export const courseController = new CourseController(courseService);
