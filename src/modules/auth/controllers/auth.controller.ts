import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body, req);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async verifyOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.verifyOtp(req.body, res, req);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }


    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, password } = req.body;
            // const ip = req.ip;
            const result = await authService.login(email, password, "112245", res);
            res.json(result); // { message: 'Logged in successfully' }
        } catch (err) {
            next(err);
        }
    }


    async refreshToken(req: Request, res: Response, next: NextFunction) {
        try {
            const plainToken = req.cookies.refreshToken;
            if (!plainToken) {
                res.status(401).json({ message: 'No refresh token' });
            }
            await authService.refreshTokens(plainToken, "1122343", res);
            res.json({ message: 'Tokens refreshed' });
        } catch (err) {
            next(err);
        }
    }

    async forgotPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email } = req.body;
            const result = await authService.sendForgotPasswordOtp(email);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // 2. Verify reset OTP (but don’t set password yet)
    async verifyResetOtp(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, otp } = req.body;
            const result = await authService.verifyResetOtp(email, otp);
            res.json(result);
        } catch (err) {
            next(err);
        }
    }

    // 3. Set new password
    async setNewPassword(req: Request, res: Response, next: NextFunction) {
        try {
            const { email, newPassword } = req.body;
            const result = await authService.setNewPassword(email, newPassword);
            res.json(result);
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
            res.json({ message: 'Logged out successfully' });
        } catch (err) {
            next(err);
        }
    }
}

export const authController = new AuthController();
