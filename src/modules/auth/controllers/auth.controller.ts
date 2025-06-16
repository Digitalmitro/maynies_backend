import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';

export class AuthController {

    async register(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.register(req.body);
            res.status(201).json(result);
        } catch (err) {
            next(err);
        }
    }

    async verifyOTP(req: Request, res: Response, next: NextFunction) {
        try {
            const result = await authService.verifyOtp(req.body, res);
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

    async logout(req: Request, res: Response, next: NextFunction) {
        try {
            const refreshToken = req.cookies.refreshToken;
            if (refreshToken) {
                await authService.revokeRefreshToken(refreshToken, "1122343");
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
