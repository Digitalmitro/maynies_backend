import { Request, Response, NextFunction } from 'express';
import { BaseError } from "../utils/baseError";


export function errorHandler(
    err: Error | BaseError,
    req: Request,
    res: Response,
    next: NextFunction
) {
    const statusCode = err instanceof BaseError ? err.statusCode : 500;
    const message = err.message || 'Something went wrong';

    console.error(`[Error] ${message}`, err);

    res.status(statusCode).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}