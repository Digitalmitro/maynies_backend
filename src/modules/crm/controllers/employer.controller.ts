// src/controllers/EmployerController.ts

import { Request, Response, NextFunction } from 'express';
import { EmployerService } from '../services/employer.service';

const employerService = new EmployerService();

export class EmployerController {
    async getOwnProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req?.user?.user?._id;
            const profile = await employerService.getProfileByUserId(userId);

            if (!profile) {
                res.status(404).json({ message: 'Employer profile not found' });
                return;
            }

            res.json({ status: 'SUCCESS', data: profile });
        } catch (err) {
            next(err);
        }
    }
}

export const employerController = new EmployerController();
