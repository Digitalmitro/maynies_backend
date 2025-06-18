// modules/users/services/UserService.ts
import { Types } from 'mongoose';
import { IUser, UserDoc } from '../types';
import { UserModel } from '../models/user.modal';
import { UserProfileModel } from '../models/userProfile.model';
import { UserRoleModel } from '../models/userRole.model';

export class UserService {
    /**
     * Creates a new user (inactive) + profile, and returns the created document.
     */
    async createUser(input: {
        name: string;
        email: string;
        passwordHash: string;
        roleId: Types.ObjectId;

    }): Promise<UserDoc> {
        // 1. Create user
        const user = await UserModel.create({
            email: input.email,
            password_hash: input.passwordHash,
            is_active: false,
        });



        // 2. Create profile
        await UserProfileModel.create({
            user_id: user._id,
            first_name: input.name.split(" ")[0],
            last_name: input.name.split(" ")[1],
        });


        // 3. Assign role via mapping table
        await UserRoleModel.create({
            user_id: user._id,
            role_id: input.roleId,
        });
        console.log(user);
        // 4. Return plain IUser
        return user as UserDoc;
    }

    /**
     * Finds a user by email.
     */
    async findByEmail(email: string): Promise<UserDoc | null> {
        return UserModel.findOne({ email });  // no .lean()
    }

    async findById(id: string | Types.ObjectId) {
        if (!Types.ObjectId.isValid(id)) throw new Error('Invalid user ID');
        return UserModel.findById(id).exec();
    }

    async getById(id: string | Types.ObjectId) {
        const user = await UserModel.findById(id)
            // if you set virtual populate
            .exec();
        if (!user) throw new Error('User not found');

        const profile = await UserProfileModel.findOne({ user_id: user._id }).exec();
        const roles = await UserRoleModel.find({ user_id: user._id })
            .populate('role_id')
            .exec();

        return { user, profile, roles: roles.map(r => r.role_id) };
    }

    // async findById(id: string): Promise<UserDoc | null> {
    //     return UserModel.findOne({ email });  // no .lean()
    // }
    /**
     * Activates a user (sets is_active=true).
     */
    async activateUser(userId: Types.ObjectId): Promise<void> {
        await UserModel.updateOne(
            { _id: userId },
            { is_active: true, email_verified_at: new Date() }
        );
    }

    async getAllUsers() {
        // sirf active users chaahiye to add a filter: { is_active: true }
        return UserModel.find().exec();
    }

    // async updatePassword(userId: Types.ObjectId, newPassword: string) {
    //     const hash = await bcrypt.hash(newPassword, 10);
    //     const res = await UserModel.updateOne(
    //         { _id: userId },
    //         { password_hash: hash }
    //     ).exec();
    //     if (res.nModified === 0) throw new NotFoundError('User not found');
    // }

    // async assignRole(userId: Types.ObjectId, roleName: string) {
    //     const role = await RoleModel.findOne({ name: roleName }).exec();
    //     if (!role) throw new BadRequestError('Invalid role');

    //     // upsert mapping
    //     await UserRoleModel.updateOne(
    //         { user_id: userId, role_id: role._id },
    //         { $setOnInsert: { assigned_at: new Date() } },
    //         { upsert: true }
    //     ).exec();
    // }

    // async removeRole(userId: Types.ObjectId, roleName: string) {
    //     const role = await RoleModel.findOne({ name: roleName }).exec();
    //     if (!role) throw new BadRequestError('Invalid role');

    //     await UserRoleModel.deleteOne({
    //         user_id: userId,
    //         role_id: role._id,
    //     }).exec();
    // }

    // async listRoles(userId: Types.ObjectId) {
    //     const mappings = await UserRoleModel.find({ user_id: userId })
    //         .populate('role_id')
    //         .exec();
    //     return mappings.map(m => m.role_id);
    // }

    // async deleteUser(userId: Types.ObjectId) {
    //     await Promise.all([
    //         UserModel.deleteOne({ _id: userId }).exec(),
    //         UserProfileModel.deleteOne({ user_id: userId }).exec(),
    //         UserRoleModel.deleteMany({ user_id: userId }).exec(),
    //     ]);
    // }


    // … aur bhi methods: getById, updatePassword, assignRole, etc.
}
