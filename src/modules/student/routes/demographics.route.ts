// src/modules/student/routes/admission.routes.ts
import { Router } from 'express';
import studentProfileController from '../controllers/student.controller';

import { CreateAdmissionSchema } from '../dtos/createAdmission.dto';
import { validate } from '../../../shared/middleware/validation';
import { UpdateAdmissionSchema } from '../dtos/updateAdmission.dto';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { UpdateAdmissionStatusSchema } from '../dtos/updateAdmissionStatus.dto';
import { UpdateStudentDemographicSchema } from '../dtos/updateStudentDemographic.dto';

const router = Router();
// Protect all routes: only students
// router.use(authenticate);

// Fetch full application
// router.get('/', authenticate, requireRole('student'), (req, res, next) => { admissionController.getApplication(req, res, next) });

// router.get('/all', authenticate, requireRole('admin'), (req, res, next) => { admissionController.getAllApplication(req, res, next) });
// Fetch only status
// router.get('/status', (req, res, next) => { admissionController.getStatus(req, res, next) });
// Create or update (re-apply) admission
// router.post('/', authenticate, requireRole('student'), validate(CreateAdmissionSchema), (req, res, next) => { admissionController.createAdmission(req, res, next) });
// router.patch('/', authenticate, requireRole('student'), validate(UpdateAdmissionSchema), (req, res, next) => { admissionController.updateAdmission(req, res, next) });
// ;
// Add a document reference

router.get(
    '/',
    authenticate, requireRole('student'),
    (req, res, next) => { studentProfileController.getProfile(req, res, next) }
)


router.patch(
    '/',
    authenticate, requireRole('student'),
    validate(UpdateStudentDemographicSchema),
    (req, res, next) => { studentProfileController.updateProfile(req, res, next) }
)
// Restore a soft-deleted document  

export default router;