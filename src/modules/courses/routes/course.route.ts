import { Router } from 'express';
import { courseController } from '../controllers/course.controller';
import { validate } from '../../../shared/middleware/validation';
import { createCourseSchema } from '../dtos/createCourse.dto';
import { updateCourseSchema } from '../dtos/updateCourse.dto';
import { addToCartSchema } from '../dtos/addToCart.dto';
import { authenticate } from '../../../modules/auth/middleware/auth.middleware';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';

const router = Router();



/* ---------------------------------------------
   🛒 STUDENT CART ROUTES
---------------------------------------------- */

// Add course to cart
router.post(
    '/cart',
    authenticate,
    requireRole('student'),
    validate(addToCartSchema),
    courseController.addToCart.bind(courseController)
);

// Get student’s cart
router.get(
    '/cart',
    authenticate,
    requireRole('student'),
    courseController.getCart.bind(courseController)
);

// Remove course from cart
router.delete(
    '/cart/:courseId',
    authenticate,
    requireRole('student'),
    courseController.removeCart.bind(courseController)
);


/* ---------------------------------------------
   🔓 PUBLIC / COMMON ROUTES
---------------------------------------------- */

// Get all published courses (public or user-specific)
router.get(
    '/',
    authenticate,
    courseController.getAllCourses.bind(courseController)
);

// Get course details by slug
router.get(
    '/:courseId/enrollments',
    authenticate,
    requireRole('admin'),
    (req, res, next) => courseController.listEnrollmentsByCourseId(req, res, next)
);

router.get(
    '/:slug',
    authenticate,
    courseController.getCourseBySlug.bind(courseController)
);



/* ---------------------------------------------
   🔐 ADMIN ROUTES
---------------------------------------------- */

// Create a new course
router.post(
    '/',
    authenticate,
    requireRole('admin'),
    validate(createCourseSchema),
    courseController.createCourse.bind(courseController)
);

// Update course
router.put(
    '/:id',
    authenticate,
    requireRole('admin'),
    validate(updateCourseSchema),
    courseController.updateCourse.bind(courseController)
);

// Soft delete course
router.delete(
    '/:id',
    authenticate,
    requireRole('admin'),
    courseController.deleteCourse.bind(courseController)
);



export default router;
