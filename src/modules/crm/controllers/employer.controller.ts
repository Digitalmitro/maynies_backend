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

            }

            res.json({ status: 'SUCCESS', data: profile });

        } catch (err) {
            next(err);
        }
    }

    async updateOwnProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req?.user?.user?._id;
            const updates = req.body; // ✅ already validated via Zod

            const result = await employerService.updateCombinedProfile(userId, updates);

            res.status(200).json({ status: 'SUCCESS', data: result });
        } catch (err) {
            next(err);
        }
    }
}

export const employerController = new EmployerController();
