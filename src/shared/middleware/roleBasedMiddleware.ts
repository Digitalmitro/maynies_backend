
import { Request, Response, NextFunction } from 'express';

export function requireRole(...allowedRoles: string[]) {
    return function (req: Request, res: Response, next: NextFunction) {
        const userRole = req?.user?.roles?.[0]?.name;

        console.log('User role:', userRole);

        if (!userRole) {
            res.status(401).json({ message: 'Unauthorized: Role not found' });
            return;
        }

        if (allowedRoles.includes(userRole)) {
            next(); // ✅ if allowed, move forward
            return
        }

        res.status(403).json({
            message: 'Forbidden: You do not have access to this resource'
        });
    };
}
