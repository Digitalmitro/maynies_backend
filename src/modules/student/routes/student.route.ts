// src/modules/student/routes/student.route.ts

import { Router } from 'express';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';

// Sub-module routes
import admissionRoutes from './admission.route';
import demographicsRoutes from './demographics.route';
import progresRoutes from './progress.route';
// import dashboardRoutes from './dashboard.routes';
// import enrollmentRoutes from './enrollment.routes';
// import paymentRoutes from './payment.routes';
// ... import other student-specific routers as needed

const router = Router();

// Apply auth + role guard to all /api/student routes
// router.use();

// Mount sub-routers
router.use('/admission', admissionRoutes);     // /api/student/admission
router.use('/demographics', demographicsRoutes);     // /api/student/dashboard
router.use('/progress', progresRoutes); // /api/student/enrollments
//router.use('/payments', paymentRoutes);       // /api/student/payments
// ... add more mounts here

export default router;
