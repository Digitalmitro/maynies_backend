// src/controllers/EmployerController.ts

import { Request, Response, NextFunction } from 'express';
import { EmployerService } from '../services/employer.service';
import { EmployeeProfileModel, IEmployeeProfile } from '../models/employer.model';
import { UpdateEmployeeInput } from '../dtos/updateEmployeeProfile.dto';
import mongoose from 'mongoose';
import { IUserProfileDoc, UserProfileModel } from '../../user/models/userProfile.model';
import { PopulatedDoc } from 'mongoose';
import { IUserDocument } from '../../user/models/user.modal';

const employerService = new EmployerService();


export class EmployerController {

    async getMyProfile(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id; // From auth middleware



            // 🍰 Fetch EmployeeProfile + populate User
            const employeeProfile = await EmployeeProfileModel.findOne({ user_id: userId })
                .populate({
                    path: "user_id",
                    select: "email is_active"
                })
                .lean();

            if (!employeeProfile) {
                return res.status(404).json({
                    success: false,
                    message: "Employee profile not found."
                });
            }

            // 🍀 Fetch UserProfile separately
            const userProfile = await UserProfileModel.findOne({ user_id: userId }).lean();

            // 🎯 Shape the response to combine everything
            const responsePayload = {
                ...userProfile || {}, // fallback to empty object
                ...employeeProfile || {},
            };

            return res.status(200).json({
                success: true,
                data: responsePayload
            });
        } catch (err: any) {
            console.error("Error in getMyProfile:", err.message);
            return res.status(500).json({
                success: false,
                message: "Server error while fetching profile."
            });
        }
    }

    async updateMyProfile(
        req: Request<{}, {}, UpdateEmployeeInput>,
        res: Response
    ) {
        const userId = req?.user?.user?._id; // From auth middleware
        const payload = req.body;

        // 🚨 Start MongoDB transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update UserProfile
            const updatedUserProfile = await UserProfileModel.findOneAndUpdate(
                { user_id: userId },
                { $set: payload },
                { new: true, runValidators: true, session }
            );

            if (!updatedUserProfile) {
                throw new Error("User profile not found");
            }

            // Update EmployeeProfile
            const updatedEmployeeProfile = await EmployeeProfileModel.findOneAndUpdate(
                { user_id: userId },
                { $set: payload },
                { new: true, runValidators: true, session }
            );

            if (!updatedEmployeeProfile) {
                throw new Error("Employee profile not found");
            }

            // ✅ Commit transaction
            await session.commitTransaction();
            session.endSession();

            return res.status(200).json({
                success: true,
                message: "Profile updated successfully.",
                data: {
                    user_profile: updatedUserProfile,
                    employee_profile: updatedEmployeeProfile
                }
            });
        } catch (err: any) {
            // ❌ Abort transaction
            await session.abortTransaction();
            session.endSession();

            console.error("updateMyProfile error:", err.message);
            return res.status(500).json({
                success: false,
                message: err.message || "Server error while updating profile."
            });
        }
    }
}

export const employerController = new EmployerController();
