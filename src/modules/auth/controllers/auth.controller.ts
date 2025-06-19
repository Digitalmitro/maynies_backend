import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { BaseError } from '../../../shared/utils/baseError';
import { sendResponse } from '../../../shared/utils/sendResponse';

export class AuthController {

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body, req);
            sendResponse({
                res,
                statusCode: 201,
                msg: 'User registered successfully',
                data: result
            })
        } catch (err) {
            next(err);
        }
    }

    async verifyOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.verifyOtp(req.body, res, req);
            sendResponse({
                res,
                statusCode: 201,
                msg: 'OTP verified successfully',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }


    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            // const ip = req.ip;
            const result = await authService.login(email, password, req.ip || "", res);
            sendResponse({
                res,
                statusCode: 200,
                msg: 'Logged in successfully',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }


    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const plainToken = req.cookies.refreshToken;
            if (!plainToken) {
                throw new BaseError('No refresh token', 401);
            }
            await authService.refreshTokens(plainToken, req.ip || "", res);
            sendResponse({
                res,
                statusCode: 200,
                msg: 'Tokens refreshed successfully',
                data: {}
            });
        } catch (err) {
            next(err);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const result = await authService.sendForgotPasswordOtp(email);
            sendResponse({
                res,
                statusCode: 200,
                msg: 'OTP sent to your email',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }

    // 2. Verify reset OTP (but don’t set password yet)
    async verifyResetOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyResetOtp(email, otp);
            sendResponse({
                res,
                statusCode: 200,
                msg: 'OTP verified successfully',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }

    // 3. Set new password
    async setNewPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, newPassword } = req.body;
            const result = await authService.setNewPassword(email, newPassword);
            sendResponse({
                res,
                statusCode: 200,
                msg: 'Password reset successfully',
                data: result
            });
        } catch (err) {
            next(err);
        }
    }

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                await authService.revokeRefreshToken(refreshToken, req.ip || "");
            }
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken');
            sendResponse({
                res,
                statusCode: 200,
                msg: 'Logged out successfully',
                data: {}
            });
        } catch (err) {
            next(err);
        }
    }
}

export const authController = new AuthController();
