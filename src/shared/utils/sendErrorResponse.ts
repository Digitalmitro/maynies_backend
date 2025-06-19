// utils/sendErrorResponse.ts
import { Response } from 'express';

export const sendErrorResponse = (res: Response, statusCode: number = 500, msg: string = 'Something went wrong') => {
    return res.status(statusCode).json({
        status: statusCode,
        msg,
        data: null
    });
};
