// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../../../shared/middleware/validation';

import { registerSchema } from '../dtos/register.dto';
import { loginSchema } from '../dtos/login.dto';

import { verifyOtpSchema } from '../dtos/verify-otp.dto';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */


router.post(
    '/register',
    validate(registerSchema),
    (req, res, next) => authController.register(req, res, next)
);

router.post(
    '/login',
    validate(loginSchema),
    (req, res, next) => authController.login(req, res, next)
);


router.post(
    '/verify-otp',
    validate(verifyOtpSchema),
    (req, res, next) => authController.verifyOTP(req, res, next)
);

router.post(
    '/refresh-token',
    (req, res, next) => authController.refreshToken(req, res, next)
);


router.post(
    '/logout',
    (req, res, next) => authController.logout(req, res, next)
);


export default router;
