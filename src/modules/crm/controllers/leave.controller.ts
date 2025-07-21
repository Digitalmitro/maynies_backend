import { Request, Response } from "express";
import { LeavePolicyInput } from "../dtos/leavePolicy.dto";
import { LeavePolicyModel } from "../models/leavePolicy.model";
import { LeaveBalanceModel } from "../models/leaveBalance.model";
import { LeaveRequestModel } from "../models/leaveRequest.model";

class Leave {

    async createOrUpdateLeavePolicy(
        req: Request<{}, {}, LeavePolicyInput>,
        res: Response
    ) {
        try {
            const { year, vacation_days, sick_days, casual_days, holidays } = req.body;

            const updatedPolicy = await LeavePolicyModel.findOneAndUpdate(
                { year },
                {
                    vacation_days,
                    sick_days,
                    casual_days,
                    holidays
                },
                {
                    new: true,
                    upsert: true, // 👈 If not found, create new
                    runValidators: true
                }
            );

            return res.status(200).json({
                success: true,
                message: "Leave policy saved successfully.",
                data: updatedPolicy
            });
        } catch (error: any) {
            console.error("createOrUpdateLeavePolicy Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Server error while saving leave policy."
            });
        }
    }

    async getLeavePolicy(req: Request, res: Response) {
        try {
            const year = req.params.year
                ? parseInt(req.params.year)
                : new Date().getFullYear();

            const policy = await LeavePolicyModel.findOne({ year });

            if (!policy) {
                return res.status(404).json({
                    success: false,
                    message: `Leave policy not found for year ${year}`
                });
            }

            return res.status(200).json({
                success: true,
                data: policy
            });
        } catch (error: any) {
            console.error("getLeavePolicy Error:", error.message);
            return res.status(500).json({
                success: false,
                message: "Server error while fetching leave policy."
            });
        }
    }

    async getMyLeaveBalance(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id; // 👤 From auth middleware
            const currentYear = new Date().getFullYear();

            const leaveBalance = await LeaveBalanceModel.findOne({
                user_id: userId,
                year: currentYear
            }).lean();

            if (!leaveBalance) {
                return res.status(404).json({
                    success: false,
                    message: "Leave balance not found for this year."
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    year: leaveBalance.year,
                    vacation: {
                        total: leaveBalance.total_vacation,
                        balance: leaveBalance.vacation_balance
                    },
                    sick: {
                        total: leaveBalance.total_sick,
                        balance: leaveBalance.sick_balance
                    },
                    casual: {
                        total: leaveBalance.total_casual,
                        balance: leaveBalance.casual_balance
                    }
                }
            });
        } catch (err: any) {
            console.error("getMyLeaveBalance error:", err.message);
            return res.status(500).json({
                success: false,
                message: "Server error while fetching leave balance."
            });
        }
    }

    async createLeaveRequest(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id; // From auth middleware
            const { type, start_date, end_date, reason } = req.body;

            // 🛡️ Validate date range
            const start = new Date(start_date);
            const end = new Date(end_date);

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date."
                });
            }

            // 📝 Calculate total days (inclusive)
            const totalDays = Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

            // 📦 Get Leave Balance for current year
            const currentYear = new Date().getFullYear();
            const leaveBalance = await LeaveBalanceModel.findOne({
                user_id: userId,
                year: currentYear
            });

            if (!leaveBalance) {
                return res.status(404).json({
                    success: false,
                    message: "Leave balance not found for current year."
                });
            }

            // 🛑 Check if enough leave balance exists
            let balanceField = "";
            if (type === "Vacation") balanceField = "vacation_balance";
            else if (type === "Sick") balanceField = "sick_balance";
            else if (type === "Casual") balanceField = "casual_balance";

            const availableBalance = leaveBalance[balanceField as keyof typeof leaveBalance];

            if (totalDays > availableBalance) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient ${type.toLowerCase()} leave balance.`
                });
            }

            // ✅ Create Leave Request
            const leaveRequest = await LeaveRequestModel.create({
                user_id: userId,
                type,
                start_date: start,
                end_date: end,
                total_days: totalDays,
                reason,
                status: "Pending"
            });

            return res.status(201).json({
                success: true,
                message: "Leave request submitted successfully.",
                data: leaveRequest
            });

        } catch (err: any) {
            console.error("Error in createLeaveRequest:", err.message);
            return res.status(500).json({
                success: false,
                message: "Server error while submitting leave request."
            });
        }
    }

    async getAllLeaveRequests(req: Request, res: Response) {
        try {
            const leaveRequests = await LeaveRequestModel.find()
                .populate({
                    path: "user_id",
                    select: "email",
                    populate: {
                        path: "profile", // Assuming User has UserProfile
                        model: "UserProfile",
                        select: "first_name last_name"
                    }
                })
                .populate({
                    path: "user_id",
                    populate: {
                        path: "employee_profile", // Optional: Designation
                        model: "EmployeeProfile",
                        select: "designation"
                    }
                })
                .sort({ createdAt: -1 }) // newest first
                .lean();

            interface PopulatedUser {
                email: string;
                profile?: {
                    first_name?: string;
                    last_name?: string;
                };
                employee_profile?: {
                    designation?: string;
                };
            }

            const formatted = leaveRequests.map((req) => {
                const user = req.user_id as unknown as PopulatedUser;
                return {
                    _id: req._id,
                    employee: {
                        name: `${user.profile?.first_name ?? ""} ${user.profile?.last_name ?? ""}`.trim(),
                        email: user.email,
                        designation: user.employee_profile?.designation || "N/A"
                    },
                    type: req.type,
                    start_date: req.start_date,
                    end_date: req.end_date,
                    total_days: req.total_days,
                    reason: req.reason,
                    status: req.status,
                    // created_at: req.createdAt
                };
            });

            return res.status(200).json({
                success: true,
                data: formatted
            });
        } catch (err: any) {
            console.error("getAllLeaveRequests error:", err);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch leave requests."
            });
        }
    }

}

export const leave = new Leave();