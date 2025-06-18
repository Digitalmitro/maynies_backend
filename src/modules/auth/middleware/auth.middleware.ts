import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { UserService } from '../../user/services/user.service';
import { authService } from '../services/auth.service';
// import { BadRequestError } from '../errors';

const userService = new UserService();
const secret = env.JWT_SECRET!;

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const accessToken = req.cookies.accessToken;

        if (!accessToken) {
            // res.status(401).json({ message: 'Access token missing' });
            await handleRefresh(req, res, next);
            return;
        }

        try {
            const payload = jwt.verify(accessToken, secret) as { sub: string };
            const user = await userService.getById(payload.sub);
            if (!user) res.status(401).json({ message: 'User not found' });

            req.user = user;
            return next();
        }
        catch (err: any) {
            if (err.name === 'TokenExpiredError') {
                console.warn('Access token expired. Trying refresh...');
                await handleRefresh(req, res, next);
                return;
            } else {
                console.error('Access token invalid:', err.message);
                res.status(401).json({ message: 'Invalid access token' });
            }
        }
    }

    catch (err: any) {
        console.error('Authentication failed:', err.message);
        res.status(401).json({ message: 'Authentication error' });
    }
}


async function handleRefresh(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token missing' });
        }

        const { userId } = await authService.refreshTokens(refreshToken, req.ip || "", res);

        // ✅ Token set ho chuka, ab user set karna hoga
        // const decoded = jwt.verify(req.cookies.accessToken, env.JWT_SECRET!) as { sub: string };
        const user = await userService.getById(userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found after refresh' });
        }

        req.user = user;
        return next();
    } catch (err: any) {
        console.error('Refresh failed:', err.message);
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
}
