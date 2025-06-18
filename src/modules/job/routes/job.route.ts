import { Router } from 'express';
import { jobController } from '../controllers/job.controller';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validation';
import { createJobSchema } from '../dtos/createJob.dto';
// import { updateJobSchema } from '../dtos/updateJob.dto';

const router = Router();

/* -----------------------------------------------
    PUBLIC ROUTES
------------------------------------------------ */

//  Get all published jobs
router.get('/', (req, res, next) => { jobController.getAllJobs(req, res, next) });

//  Get job by slug (e.g. /slug/frontend-developer)
router.get('/slug/:slug', (req, res, next) => { jobController.getJobBySlug(req, res, next) });


/* -----------------------------------------------
    STUDENT ROUTES
------------------------------------------------ */

//  Get own job applications
router.get('/myApplications', authenticate, (req, res, next) => { jobController.getMyApplications(req, res, next) });

//  Apply to a job
router.post('/:id/apply', authenticate, (req, res, next) => { jobController.applyToJob(req, res, next) });


/* -----------------------------------------------
    EMPLOYER / ADMIN ROUTES (PROTECTED)
------------------------------------------------ */

//  Create job (requires validation)
router.post('/', authenticate, validate(createJobSchema), (req, res, next) => { jobController.createJob(req, res, next) });

//  Update job
router.patch('/:id', authenticate, (req, res, next) => { jobController.updateJob(req, res, next) });

//  Delete job
router.delete('/:id', authenticate, (req, res, next) => { jobController.deleteJob(req, res, next) });

//  View applications for a job (by employer/admin)
router.get('/:id/applications', authenticate, jobController.getJobApplications);

//  Update status of an application
router.patch('/applications/:id/status', authenticate, jobController.updateApplicationStatus);

//  Get status history of an application
router.get('/applications/:id/history', authenticate, jobController.getApplicationHistory);


/* -----------------------------------------------
   MUST BE LAST — DYNAMIC ROUTE
------------------------------------------------ */

// Get job by ID (should be last to avoid conflict with /myApplications)
router.get('/:id', (req, res, next) => { jobController.getJobById(req, res, next) });

export default router;
