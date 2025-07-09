// src/modules/profile/student-profile.controller.ts
import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { UpdateStudentDemographicInput } from '../dtos/updateStudentDemographic.dto';
import { StudentProfileModel } from '../models/studentProfile.model';
import { UserProfileModel } from '../../user/models/userProfile.model';

class StudentProfileController {

    /**
     * GET /profile
     * Fetch the current student's profile document.
     */

    // inside StudentProfileController
    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req?.user?.user?._id;
            const [userProfile, studentProfile] = await Promise.all([
                UserProfileModel.findOne({ user_id: userId }).lean(),
                StudentProfileModel.findOne({ user_id: userId }).lean(),
            ]);

            return res.status(200).json({
                success: true,
                data: {
                    ...userProfile,
                    ...studentProfile
                }
            });
        } catch (err) {
            next(err);
        }
    }


    /**
     * PATCH /profile
     * Update the current student's demographic fields.
     */

    async updateProfile(
        req: Request<{}, {}, UpdateStudentDemographicInput>,
        res: Response,
        next: NextFunction
    ) {
        try {
            const userId = (req.user?.user as any)._id as string;
            const payload = req.body;

            console.log(payload)
            // Split payload
            const userProfileUpdate: Partial<{ first_Name: string; last_Name: string; avatar_url: string; gender: string }> = {};
            const studentProfileUpdate: Partial<{ date_of_birth: Date; mothers_name?: string; race?: string; state?: string; city?: string }> = {};

            // fullName -> firstName, lastName
            if (payload.firstName) {

                userProfileUpdate.first_Name = payload.firstName;
            }
            if (payload.lastName) {
                const [firstName, ...rest] = payload.firstName.trim().split(' ');
                userProfileUpdate.first_Name = firstName;
                userProfileUpdate.last_Name = rest.join(' ') || '';
            }

            if (payload.avatarUrl) {
                userProfileUpdate.avatar_url = payload.avatarUrl;
            }
            if (payload.gender) {
                userProfileUpdate.gender = payload.gender;
            }

            // StudentProfile fields
            if (payload.birthDate) {
                studentProfileUpdate.date_of_birth = new Date(payload.birthDate);
            }
            if (payload.mothers_name) {
                studentProfileUpdate.mothers_name = payload.mothers_name;
            }
            if (payload.race) {
                studentProfileUpdate.race = payload.race;
            }
            if (payload.state) {
                studentProfileUpdate.state = payload.state;
            }
            if (payload.city) {
                studentProfileUpdate.city = payload.city;
            }

            // Perform updates in parallel
            const [updatedUserProfile, updatedStudentProfile] = await Promise.all([
                UserProfileModel.findOneAndUpdate(
                    { user_id: new Types.ObjectId(userId) },
                    { $set: userProfileUpdate },
                    { new: true, upsert: true }
                ).lean(),

                StudentProfileModel.findOneAndUpdate(
                    { user_id: new Types.ObjectId(userId) },
                    { $set: studentProfileUpdate },
                    { new: true, upsert: true }
                ).lean(),
            ]);

            const combined = {
                ...updatedUserProfile,
                ...updatedStudentProfile,
            };

            return res.status(200).json({ success: true, data: combined });
        } catch (err) {
            next(err);
        }
    }


}

export default new StudentProfileController();
