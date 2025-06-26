import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { validate } from '../../../shared/middleware/validation';
import { createCourseSchema } from '../dtos/createCourse.dto';
import { updateCourseSchema } from '../dtos/updateCourse.dto';
import { authenticate } from '../../../modules/auth/middleware/auth.middleware';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';

const router = Router();

// 🔐 Admin creates a course
router.get(
    '/',
    authenticate,
    requireRole('admin'),
    (req, res, next) => { courseController.getAllCourses(req, res, next) }
);

router.post(
    '/',
    authenticate,
    requireRole('admin'),
    validate(createCourseSchema),
    (req, res, next) => { courseController.createCourse(req, res, next) }
);

router.get(
    '/:slug',
    authenticate,
    requireRole('admin'),
    (req, res, next) => { courseController.getCourseBySlug(req, res, next) }
);

router.put(
    '/:id',
    authenticate,
    requireRole('admin'),
    validate(updateCourseSchema),
    courseController.updateCourse.bind(courseController)
);

router.delete(
    '/:id',
    authenticate,
    requireRole('admin'),
    courseController.deleteCourse.bind(courseController)
);

// 🚀 (Future)
// router.get('/', courseController.getAllCourses);
// router.get('/:slug', courseController.getCourseDetail);
// router.get('/:id/materials', courseController.getCourseMaterials);
// router.get('/:id/enrollments', authenticate, requireRole('admin'), courseController.getEnrollmentsByCourse);

export default router;
