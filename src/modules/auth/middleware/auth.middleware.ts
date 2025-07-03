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
        const { accessToken, refreshToken } = req.cookies;

        // console.log(accessToken, refreshToken);

        if (!accessToken && !refreshToken) {
            throw new BaseError('Not authenticated', 401);
        }

        if (accessToken) {
            try {
                const payload = jwt.verify(accessToken, secret) as { sub: string };
                const user = await userService.getById(payload.sub);
                if (!user) throw new BaseError('User not found', 401);
                req.user = user;
                return next();
            } catch (err: any) {
                if (err.name !== 'TokenExpiredError') {
                    throw new BaseError('Invalid access token', 401);
                }
                // else token expired, fall through to refresh
            }
        }
        // Either no accessToken or it was expired
        await handleRefresh(req, res);
        return next();
    } catch (err: any) {
        console.error('Auth middleware error:', err);
        return next(err instanceof BaseError ? err : new BaseError('Authentication error', 500));
    }

}


async function handleRefresh(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) throw new BaseError('No refresh token provided', 401);

    const { userId } = await authService.refreshTokens(refreshToken, req.ip || '', res);
    const user = await userService.getById(userId);
    if (!user) throw new BaseError('User not found after refresh', 401);

    req.user = user;
}

