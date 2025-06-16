// src/shared/middleware/validate.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';

export const validate = <T>(schema: ZodSchema<T>): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            // SEND the error response, but don't `return res...`
            res.status(400).json({ errors });
            return;            // just exit the middleware (void)
        }
        // attach parsed + typed data
        req.body = result.data;
        next();
    };
};
