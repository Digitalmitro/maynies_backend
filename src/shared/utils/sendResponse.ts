// utils/sendResponse.ts
import { Response } from 'express';

interface SendResponseOptions {
    res: Response;
    statusCode?: number;
    msg?: string;
    data?: any;
}

export const sendResponse = ({ res, statusCode = 200, msg = 'Success', data = {} }: SendResponseOptions) => {
    return res.status(statusCode).json({
        status: statusCode,
        msg,
        data
    });
};
