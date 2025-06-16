import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import { UserService } from '../../user/services/user.service';
// import { BadRequestError } from '../errors';

const userService = new UserService();
const secret = env.JWT_SECRET!;

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const token = req.cookies.accessToken;
        console.log('Raw token from cookie:', token);

        if (!token) {
            // 401 if no token
            res.status(401).json({ message: 'Not authenticated' });
            return;
        }

        const decoded = jwt.decode(token, { complete: true });
        console.log('Decoded token (no verify):', decoded);


        // Verify access token
        const payload = jwt.verify(token, secret) as { sub: string };
        console.log('Verified payload:', payload);

        const user = await userService.getById(payload.sub);
        if (!user) {
            res.status(401).json({ message: 'User not found' });
            return;
        }

        req.user = user;        // extend Express.Request with user!
        next();
    } catch (err: any) {
        console.error('JWT error name/message:', err.name, err.message);
        if (err.name === 'TokenExpiredError') {
            res.status(401).json({ message: 'Token expired' });
            return;
        }
        res.status(401).json({ message: 'Invalid token' });
    }
}
