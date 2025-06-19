import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { UserService } from '../../user/services/user.service';
import { authService } from '../services/auth.service';
import { BaseError } from '../../../shared/utils/baseError';

const userService = new UserService();
const secret = env.JWT_SECRET!;

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            await handleRefresh(req, res, next);
            return;
        }

        try {
            const payload = jwt.verify(accessToken, secret) as { sub: string };
            const user = await userService.getById(payload.sub);
            if (!user) {
                throw new BaseError('User not found', 401);
            };

            req.user = user;
            return next();
        }
        catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                await handleRefresh(req, res, next);
                return;
            } else {
                throw new BaseError('Invalid access token', 401);
            }
        }
    }

    catch (err: any) {
        console.error('Authentication failed:', err.message);

        if (err instanceof BaseError) {
            throw new BaseError(err.message, err.statusCode);
        }
    }
}


async function handleRefresh(req: Request, res: Response, next: NextFunction) {

    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            throw new BaseError('No refresh token provided', 401);
        }

        const { userId } = await authService.refreshTokens(refreshToken, req.ip || "", res);

        const user = await userService.getById(userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found after refresh' });
        }

        req.user = user;
        return next();
    } catch (err: any) {
        if (err instanceof BaseError) {
            throw new BaseError(err.message, err.statusCode);
        }

    }
}
