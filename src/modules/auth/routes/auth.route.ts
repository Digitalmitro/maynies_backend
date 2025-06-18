// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate } from '../../../shared/middleware/validation';

import { registerSchema } from '../dtos/register.dto';
import { loginSchema } from '../dtos/login.dto';

import { verifyOtpSchema } from '../dtos/verify-otp.dto';
import rateLimit from 'express-rate-limit';
import { forgotPasswordSchema } from '../dtos/forgotPassword.dto';
import { setNewPasswordSchema } from '../dtos/setNewPassword.dto';


const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */

export const loginRateLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Max 5 requests per IP
    message: {
        message: 'Too many login attempts from this IP. Please try again after 10 minutes.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


router.post(
    '/register',
    validate(registerSchema),
    (req, res, next) => authController.register(req, res, next)
);

router.post(
    '/login',
    validate(loginSchema), loginRateLimiter,
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

router.post('/forgot-password', validate(forgotPasswordSchema), authController.forgotPassword);

router.post('/verify-reset-otp', validate(verifyOtpSchema), authController.verifyResetOtp);

router.post('/set-new-password', validate(setNewPasswordSchema), authController.setNewPassword);

router.post(
    '/logout',
    (req, res, next) => authController.logout(req, res, next)
);


export default router;
