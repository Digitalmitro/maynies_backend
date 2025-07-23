import { Request, Response } from "express";
import { LeavePolicyInput } from "../dtos/leavePolicy.dto";
import { LeavePolicyModel } from "../models/leavePolicy.model";
import { LeaveBalanceModel } from "../models/leaveBalance.model";
import { LeaveRequestModel } from "../models/leaveRequest.model";
import { UserProfileModel } from "../../user/models/userProfile.model";
import { EmployeeProfileModel } from "../models/employer.model";

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
            const userId = req.user?.user?._id;
            const { type, start_date, end_date, reason } = req.body;

            const start = new Date(start_date);
            const end = new Date(end_date);

            if (start > end) {
                return res.status(400).json({
                    success: false,
                    message: "Start date cannot be after end date."
                });
            }

            const totalDays = Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;

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

            const balanceFieldMap = {
                Vacation: "vacation_balance",
                Sick: "sick_balance",
                Casual: "casual_balance"
            } as const;

            const balanceField = balanceFieldMap[type as keyof typeof balanceFieldMap];

            if (!balanceField) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid leave type."
                });
            }

            const availableBalance = leaveBalance[balanceField as keyof typeof leaveBalance];

            if (availableBalance <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `You have no ${type.toLowerCase()} leaves left for this year.`
                });
            }

            if (totalDays > availableBalance) {
                return res.status(400).json({
                    success: false,
                    message: `You only have ${availableBalance} ${type.toLowerCase()} days left.`
                });
            }

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
            // 📝 Step 1: Get all leave requests + user basic data
            const leaveRequests = await LeaveRequestModel.find()
                .populate({
                    path: "user_id",
                    select: "email" // Just get email from User
                })
                .sort({ createdAt: -1 }) // Newest first
                .lean();

            if (!leaveRequests.length) {
                return res.status(404).json({
                    success: false,
                    message: "No leave requests found."
                });
            }

            // 📝 Step 2: Extract user IDs from leave requests
            const userIds = leaveRequests.map(req => req.user_id);

            // 📝 Step 3: Fetch UserProfiles for those users
            const userProfiles = await UserProfileModel.find({ user_id: { $in: userIds } })
                .select("user_id first_name last_name")
                .lean();

            // 📝 Step 4: Create a Map for quick lookup
            const profileMap = new Map(
                userProfiles.map(profile => [profile.user_id.toString(), profile])
            );

            // 📝 Step 5: Combine leaveRequests with UserProfiles
            const formatted = leaveRequests.map((req) => {
                const user = req.user_id as unknown as { _id: any; email: string };
                const profile = profileMap.get(user._id.toString());

                return {
                    _id: req._id,
                    employee: {
                        name: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
                        email: user.email
                    },
                    type: req.type,
                    start_date: req.start_date,
                    end_date: req.end_date,
                    total_days: req.total_days,
                    reason: req.reason,
                    status: req.status,
                    admin_comment: req.admin_comment,
                    // created_at: req.createdAt
                };
            });

            return res.status(200).json({
                success: true,
                data: formatted
            });
        } catch (err: any) {
            console.error("getAllLeaveRequests error:", err.message);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch leave requests."
            });
        }
    }

    async getSingleLeaveRequest(req: Request, res: Response) {
        try {
            const { id } = req.params;

            // 📝 Fetch leave request by ID
            const leaveRequest = await LeaveRequestModel.findById(id)
                .populate({
                    path: "user_id",
                    select: "email",
                })
                .lean();

            if (!leaveRequest) {
                return res.status(404).json({
                    success: false,
                    message: "Leave request not found."
                });
            }

            // 📝 Fetch employee’s UserProfile + EmployeeProfile
            const userId =
                typeof leaveRequest.user_id === "object" && leaveRequest.user_id !== null
                    ? (leaveRequest.user_id as any)._id ?? leaveRequest.user_id
                    : leaveRequest.user_id;

            const [userProfile, employeeProfile] = await Promise.all([
                UserProfileModel.findOne({ user_id: userId })
                    .select("first_name last_name")
                    .lean(),
                EmployeeProfileModel.findOne({ user_id: userId })
                    .select("designation")
                    .lean()
            ]);

            // 🎯 Shape response
            const responsePayload = {
                _id: leaveRequest._id,
                employee: {
                    name: `${userProfile?.first_name ?? ""} ${userProfile?.last_name ?? ""}`.trim(),
                    email: typeof leaveRequest.user_id === "object" && "email" in leaveRequest.user_id
                        ? (leaveRequest.user_id as any).email
                        : "",
                    designation: employeeProfile?.designation || "N/A"
                },
                type: leaveRequest.type,
                start_date: leaveRequest.start_date,
                end_date: leaveRequest.end_date,
                total_days: leaveRequest.total_days,
                reason: leaveRequest.reason,
                status: leaveRequest.status,
                admin_comment: leaveRequest.admin_comment,
                // created_at: leaveRequest.created_at
            };

            return res.status(200).json({
                success: true,
                data: responsePayload
            });
        } catch (err: any) {
            console.error("getSingleLeaveRequest error:", err.message);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch leave request."
            });
        }
    }

    async updateLeaveRequestStatus(req: Request, res: Response) {
        const { id } = req.params;
        const { status, admin_comment } = req.body;

        if (!["Approved", "Rejected"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        // Fetch LeaveRequest
        const leaveRequest = await LeaveRequestModel.findById(id);
        if (!leaveRequest) return res.status(404).json({ success: false, message: "Leave request not found" });

        if (leaveRequest.status !== "Pending") {
            return res.status(400).json({ success: false, message: "Leave request already processed" });
        }

        // Approve Flow
        if (status === "Approved") {
            const leaveBalance = await LeaveBalanceModel.findOne({ user_id: leaveRequest.user_id });
            if (!leaveBalance) throw new Error("Leave balance not found");

            const type = leaveRequest.type.toLowerCase() + "_balance";
            // Use type assertion to index leaveBalance
            if ((leaveBalance as any)[type] < leaveRequest.total_days) {
                return res.status(400).json({ success: false, message: "Not enough leave balance" });
            }

            // Deduct days
            (leaveBalance as any)[type] -= leaveRequest.total_days;
            await leaveBalance.save();
        }

        // Update LeaveRequest
        leaveRequest.status = status;
        leaveRequest.admin_comment = admin_comment || null;
        await leaveRequest.save();

        return res.status(200).json({
            success: true,
            message: `Leave request ${status.toLowerCase()}`,
            data: leaveRequest
        });
    }

    async updateLeaveBalance(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const { vacation_balance, sick_balance, casual_balance } = req.body;

            const currentYear = new Date().getFullYear();

            // 🍰 Find existing balance or create if missing
            const leaveBalance = await LeaveBalanceModel.findOneAndUpdate(
                { user_id: userId, year: currentYear },
                {
                    $set: {
                        ...(vacation_balance !== undefined && { vacation_balance }),
                        ...(sick_balance !== undefined && { sick_balance }),
                        ...(casual_balance !== undefined && { casual_balance }),
                    }
                },
                { new: true, upsert: true, runValidators: true }
            );

            return res.status(200).json({
                success: true,
                message: "Leave balance updated successfully.",
                data: leaveBalance
            });
        } catch (err: any) {
            console.error("Error in updateLeaveBalance:", err.message);
            return res.status(500).json({
                success: false,
                message: "Server error while updating leave balance."
            });
        }
    }

    async getMyLeaveRequests(req: Request, res: Response) {
        try {
            const userId = req.user?.user?._id; // Auth middleware
            const statusFilter = req.query.status as "all" | "pending" | "approved" | "rejected" | undefined;

            // 🥷 Build dynamic filter
            const filter: any = { user_id: userId };
            if (statusFilter && statusFilter !== "all") {
                filter.status = statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).toLowerCase(); // Capitalize
            }

            // 📦 Fetch leave requests
            const leaveRequests = await LeaveRequestModel.find(filter)
                .sort({ createdAt: -1 })
                .lean();

            return res.status(200).json({
                success: true,
                data: leaveRequests
            });
        } catch (err: any) {
            console.error("Error in getMyLeaveRequests:", err.message);
            return res.status(500).json({
                success: false,
                message: "Failed to fetch leave requests."
            });
        }
    }

}

export const leave = new Leave();