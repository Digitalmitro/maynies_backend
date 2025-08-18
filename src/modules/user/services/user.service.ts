// modules/users/services/UserService.ts
import { Types } from 'mongoose';
import { IUser, UserDoc } from '../types';
import { UserModel } from '../models/user.modal';
import { UserProfileModel } from '../models/userProfile.model';
import { UserRoleModel } from '../models/userRole.model';
import { EmployeeProfileModel } from '../../crm/models/employer.model';
import { StudentProfileModel } from '../../student/models/studentProfile.model';
import { LeaveService } from '../../crm/services/leave.service';
import { EmployeeSalaryModel } from '../../crm/models/emploeeSalary.model';

export class UserService {
    /**
     * Creates a new user (inactive) + profile, and returns the created document.
     */
    async createUser(input: {
        name: string;
        email: string;
        passwordHash: string;
        roleId: Types.ObjectId;
        roleName?: string; // optional, for future use
    }): Promise<UserDoc> {
        const session = await UserModel.startSession();
        session.startTransaction();

        try {
            // 1. Create user
            const user = await UserModel.create([{
                email: input.email,
                password_hash: input.passwordHash,
                is_active: false,
            }], { session });

            const [firstName, ...rest] = input.name.trim().split(" ");
            const lastName = rest.join(" ") || "";

            // 2. Create profile
            await UserProfileModel.create([{
                user_id: user[0]._id,
                first_name: firstName,
                last_name: lastName,
            }], { session });

            // ✅ 3. Conditionally create role-based profile
            if (input.roleName && input.roleName === 'employer') {
                await EmployeeProfileModel.create([{
                    user_id: user[0]._id,
                }], { session });

                await LeaveService.assignInitialLeaveBalance((user[0]._id as Types.ObjectId).toString());

                await EmployeeSalaryModel.create([{
                    employee_id: user[0]._id,
                    base_salary: 0,
                    bonuses: 0,
                    deductions: 0,
                    pay_cycle: 'monthly',
                    // configured: false,
                }], { session });

            }

            if (input.roleName === 'student') {
                await StudentProfileModel.create(
                    [{ user_id: user[0]._id }],
                    { session }
                );
            }

            // 4. Assign role
            await UserRoleModel.create([{
                user_id: user[0]._id,
                role_id: input.roleId,
            }], { session });

            await session.commitTransaction();
            session.endSession();

            // console.log("✅ User created:", user[0]._id.toString());

            return user[0] as UserDoc;

        } catch (err) {
            await session.abortTransaction();
            session.endSession();
            console.error("❌ User creation failed:", err);
            throw err;
        }
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
