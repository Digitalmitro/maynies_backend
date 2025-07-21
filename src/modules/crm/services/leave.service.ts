import { LeavePolicyModel } from "../models/leavePolicy.model";
import { LeaveBalanceModel } from "../models/leaveBalance.model";

export class LeaveService {
    static async assignInitialLeaveBalance(userId: string) {

        console.log(userId, "assignInitialLeaveBalance called");

        try {
            const currentYear = new Date().getFullYear();

            // Fetch current year's leave policy
            const policy = await LeavePolicyModel.findOne({ year: currentYear });
            if (!policy) {
                console.warn(`⚠️ No LeavePolicy set for year ${currentYear}`);
                return;
            }

            // Check if balance already exists (avoid duplicates)
            const existing = await LeaveBalanceModel.findOne({
                user_id: userId,
                year: currentYear
            });
            if (existing) {
                console.log(`ℹ️ LeaveBalance already exists for user ${userId}`);
                return;
            }

            // Create initial leave balance
            await LeaveBalanceModel.create({
                user_id: userId,
                year: currentYear,
                total_vacation: policy.vacation_days,
                total_sick: policy.sick_days,
                total_casual: policy.casual_days,
                vacation_balance: policy.vacation_days,
                sick_balance: policy.sick_days,
                casual_balance: policy.casual_days
            });

            console.log(`🎉 LeaveBalance created for user ${userId}`);
        } catch (err) {
            console.error("❌ Error in assignInitialLeaveBalance:", err);
            throw new Error("Failed to assign initial leave balance.");
        }
    }
}
