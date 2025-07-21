import { Request, Response, NextFunction } from 'express';

export function requireRole(...allowedRoles: string[]) {
    return function (req: Request & { user?: any }, res: Response, next: NextFunction) {
        const userRoles = req?.user?.roles ?? [];


        if (!Array.isArray(userRoles) || userRoles.length === 0) {
            res.status(401).json({ message: 'Unauthorized: No roles found' });
            return
        }

        const roleNames = userRoles.map((r: any) => r.name?.trim());

        console.log(roleNames);
        const isAllowed = allowedRoles.some(role => roleNames.includes(role));
        console.log(isAllowed);
        if (!isAllowed) {
            res.status(403).json({
                message: 'Forbidden: You do not have access to this resource',
            });

            return;
        }

        // ✅ authorized
        next();
    };
}
