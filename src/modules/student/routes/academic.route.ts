import { NextFunction, Router, Request, Response } from 'express';
import {
    academicController
} from '../controllers/acedemic.controller';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { authenticate } from '../../auth/middleware/auth.middleware';



const router = Router();


router.get('/years', authenticate,
    requireRole('student', 'admin'),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.getAllAcademicYears(req, res, next)
    });


router.post(
    '/years',
    authenticate,
    requireRole('admin'),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.createAcademicYear(req, res, next)
    })


router.get('/years/:yearName',
    authenticate,
    requireRole('admin', "student"),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.getAcademicYearByName(req, res, next)
    })


// 🔥 Create a new event
router.post(
    '/:yearName/events',
    authenticate,
    requireRole('admin', "student"),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.createEvent(req, res, next)
    })


// 📥 Get all events for a year (optional ?category & ?from=&to=)
router.get(
    '/:yearName/events',
    authenticate,
    requireRole('admin', "student"),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.getEventsByYear(req, res, next)
    })


// 📥 Get single event by ID
router.get(
    '/:yearName/events/:eventId',
    authenticate,
    requireRole('admin', "student"),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.getEventById(req, res, next)
    })



// 🔄 Update an event
router.patch(
    '/:yearName/events/:eventId',
    authenticate,
    requireRole('admin', "student"),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.updateEvent(req, res, next)
    })


// ❌ Delete an event
router.delete(
    '/:yearName/events/:eventId',
    authenticate,
    requireRole('admin'),
    (req: Request, res: Response, next: NextFunction) => {
        academicController.deleteEvent(req, res, next)
    })

// 📥 Get events by category (optional shortcut)
// router.get(
//     '/:yearName/events/category/:category',
//     eventController.getEventsByCategory.bind(eventController)
// );

// 📅 Calendar view (for frontend calendar UI)
// router.get(
//     '/:yearName/events/calendar',
//     eventController.getEventsCalendarView.bind(eventController)
// );


export default router;
