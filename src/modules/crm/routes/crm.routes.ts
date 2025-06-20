// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { validate } from '../../../shared/middleware/validation';
import { authenticate } from '../../auth/middleware/auth.middleware';
import { employerController } from '../controllers/employer.controller';
import { requireRole } from '../../../shared/middleware/roleBasedMiddleware';
import { updateEmployerProfileSchema } from '../dtos/employerProfile';

const router = Router();

// router.get(
//     '/', authenticate,
//     // validate(registerSchema),
//     (req, res, next) => {
//         employerController.getOwnProfile(req, res, next);
//         return;
//     }
// );

router.get(
    '/',
    authenticate,
    requireRole('employer', 'admin'),
    employerController.getOwnProfile // ✅ no wrapping
);



router.patch(
    '/',
    authenticate,
    requireRole('employer', 'admin'),
    validate(updateEmployerProfileSchema), // ✅ plug here
    employerController.updateOwnProfile
);


export default router;
