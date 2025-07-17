// src/controllers/EmployerController.ts

import { Request, Response, NextFunction } from 'express';
import { EmployerService } from '../services/employer.service';
import { EmployeeProfileModel } from '../models/employer.model';

const employerService = new EmployerService();

export class EmployerController {

    async getMyProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id; // req.user comes from JWT middleware

            // Find employee profile linked to logged-in user
            const profile = await EmployeeProfileModel.findOne({ user_id: userId });

            if (!profile) {
                return res.status(404).json({
                    success: false,
                    message: "Employee profile not found."
                });
            }

            return res.status(200).json({
                success: true,
                data: profile
            });
        } catch (err) {
            console.error("Error in getMyProfile:", err);
            return res.status(500).json({
                success: false,
                message: "Server error while fetching profile."
            });
        }
    }
}

export const employerController = new EmployerController();
