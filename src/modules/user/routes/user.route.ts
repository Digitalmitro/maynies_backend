// src/modules/auth/routes/auth.routes.ts

import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { validate } from '../../../shared/middleware/validation';
import { authenticate } from '../../auth/middleware/auth.middleware';

// import { registerSchema } from '../dtos/register.dto';

// import { verifyOtpSchema } from '../dtos/verify-otp.dto';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 */


router.get(
    '/users', authenticate,
    // validate(registerSchema),
    (req, res, next) => userController.getAllUsers(req, res, next)
);


// router.post(
//     '/verify-otp',
//     validate(verifyOtpSchema),
//     (req, res, next) => authController.verifyOTP(req, res, next)
// );

// /**
//  * @route   POST /api/auth/login
//  * @desc    Authenticate user and return token
//  */
// router.post(
//     '/login',
//     validate(loginSchema),
//     (req, res, next) => authController.login(req, res, next)
// );

// /**
//  * @route   POST /api/auth/forgot-password
//  * @desc    Generate password reset token and send via email
//  */
// router.post(
//     '/forgot-password',
//     validate(forgotPasswordSchema),
//     (req, res, next) => authController.forgotPassword(req, res, next)
// );

// /**
//  * @route   POST /api/auth/reset-password
//  * @desc    Reset password using token
//  */
// router.post(
//     '/reset-password',
//     validate(resetPasswordSchema),
//     (req, res, next) => authController.resetPassword(req, res, next)
// );

export default router;
