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
}
