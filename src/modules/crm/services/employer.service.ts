// src/services/employer.service.ts

import { EmployeeProfileModel } from '../models/employer.model';
import { UserProfileModel } from '../../user/models/userProfile.model';

export class EmployerService {


    async getProfileByUserId(userId: string) {
        const profile = await EmployeeProfileModel.findOne({ user_id: userId }).lean();

        if (!profile) return null;

        const userProfile = await UserProfileModel.findOne({ user_id: userId }).lean();

        return {
            ...profile,
            first_name: userProfile?.first_name || null,
            last_name: userProfile?.last_name || null,
            avatar_url: userProfile?.avatar_url || null
        };
    }

    async updateCombinedProfile(userId: string, updates: Record<string, any>) {
        const userProfileUpdates: any = {};
        const employerProfileUpdates: any = {};

        // Separate fields for UserProfile
        if ('first_name' in updates) userProfileUpdates.first_name = updates.first_name;
        if ('last_name' in updates) userProfileUpdates.last_name = updates.last_name;
        if ('avatar_url' in updates) userProfileUpdates.avatar_url = updates.avatar_url;
        if ('bio' in updates) userProfileUpdates.bio = updates.bio;

        // Separate fields for EmployerProfile
        if ('designation' in updates) employerProfileUpdates.designation = updates.designation;
        if ('mobile_number' in updates) employerProfileUpdates.mobile_number = updates.mobile_number;
        if ('work_number' in updates) employerProfileUpdates.work_number = updates.work_number;
        if ('location' in updates) employerProfileUpdates.location = updates.location;
        if ('date_of_joining' in updates) employerProfileUpdates.date_of_joining = updates.date_of_joining;

        // Update both in parallel
        const [userProfile, employerProfile] = await Promise.all([
            UserProfileModel.findOneAndUpdate({ user_id: userId }, { $set: userProfileUpdates }, { new: true, lean: true }),
            EmployeeProfileModel.findOneAndUpdate({ user_id: userId }, { $set: employerProfileUpdates }, { new: true, lean: true })
        ]);

        return {
            ...employerProfile,
            first_name: userProfile?.first_name || null,
            last_name: userProfile?.last_name || null,
            avatar_url: userProfile?.avatar_url || null,
            bio: userProfile?.bio || null
        };
    }


}
