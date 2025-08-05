// src/controllers/EmployerController.ts

import { Request, Response, NextFunction } from "express";
import { EmployerService } from "../services/employer.service";
import {
  EmployeeProfileModel,
  IEmployeeProfile,
} from "../models/employer.model";
import { UpdateEmployeeInput } from "../dtos/updateEmployeeProfile.dto";
import mongoose from "mongoose";
import {
  IUserProfileDoc,
  UserProfileModel,
} from "../../user/models/userProfile.model";
import { PopulatedDoc } from "mongoose";
import { IUserDocument } from "../../user/models/user.modal";
import { EmployeeSalaryModel } from "../models/emploeeSalary.model";

const employerService = new EmployerService();

export class EmployerController {
  async getMyProfile(req: Request, res: Response) {
    try {
      const userId = req.user?.user?._id; // From auth middleware

      // 🍰 Fetch EmployeeProfile + populate User
      const employeeProfile = await EmployeeProfileModel.findOne({
        user_id: userId,
      })
        .populate({
          path: "user_id",
          select: "email is_active",
        })
        .lean();

      if (!employeeProfile) {
        return res.status(404).json({
          success: false,
          message: "Employee profile not found.",
        });
      }

      // 🍀 Fetch UserProfile separately
      const userProfile = await UserProfileModel.findOne({
        user_id: userId,
      }).lean();

      // 🎯 Shape the response to combine everything
      const responsePayload = {
        ...(userProfile || {}), // fallback to empty object
        ...(employeeProfile || {}),
      };

      return res.status(200).json({
        success: true,
        data: responsePayload,
      });
    } catch (err: any) {
      console.error("Error in getMyProfile:", err.message);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching profile.",
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
      const updatedEmployeeProfile =
        await EmployeeProfileModel.findOneAndUpdate(
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
          employee_profile: updatedEmployeeProfile,
        },
      });
    } catch (err: any) {
      // ❌ Abort transaction
      await session.abortTransaction();
      session.endSession();

      console.error("updateMyProfile error:", err.message);
      return res.status(500).json({
        success: false,
        message: err.message || "Server error while updating profile.",
      });
    }
  }

  async updateEmployeeSalary(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      const {
        base_salary,
        bonuses = 0,
        deductions = 0,
        pay_cycle,
        effective_from,
        remarks,
      } = req.body;

      // 🔍 Step 1: Check if salary already exists
      let existing = await EmployeeSalaryModel.findOne({
        employee_id: employeeId,
      });

      if (existing) {
        // 🛠️ Update Existing
        const updated = await EmployeeSalaryModel.findOneAndUpdate(
          { employee_id: employeeId },
          {
            base_salary,
            bonuses,
            deductions,
            pay_cycle,
            effective_from,
            remarks,
          },
          { new: true, runValidators: true }
        );

        return res.status(200).json({
          message: "Employee salary updated successfully.",
          data: updated,
        });
      }

      // 🔍 Step 2: If not exists, check if employee profile exists
      const profile = await EmployeeProfileModel.findOne({
        user_id: employeeId,
      });

      if (!profile) {
        return res.status(404).json({ message: "Employee profile not found." });
      }

      // ✅ Step 3: Create new salary config
      const newSalary = new EmployeeSalaryModel({
        employee_id: employeeId,
        base_salary,
        bonuses,
        deductions,
        pay_cycle,
        effective_from,
        remarks,
        configured_by: req.user?.user?._id, // Assuming `req.user` has authenticated user info
      });
        
      await newSalary.save();

      
      // 🔄 Update employee profile as configured
      profile.salary_configured = true;
      await profile.save();

      return res.status(201).json({
        message: "Employee salary configured successfully.",
        data: newSalary,
      });
    } catch (error) {
      console.error("Error in salary config:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }

  async getAllEmployee(req: Request, res: Response) {
    try {
      // 1️⃣ Fetch employee profiles (only designation and user_id)
      const employees = await EmployeeProfileModel.find(
        {},
        { designation: 1, user_id: 1 }
      ).lean();

      const userIds = employees.map((emp) => emp.user_id);

      // 2️⃣ Fetch user profiles for those employees
      const userProfiles = await UserProfileModel.find(
        {
          user_id: { $in: userIds },
        },
        {
          user_id: 1,
          first_name: 1,
          last_name: 1,
        }
      ).lean();

      // 3️⃣ Map for quick access
      const profileMap = new Map(
        userProfiles.map((up) => [
          String(up.user_id),
          `${up.first_name ?? ""} ${up.last_name ?? ""}`.trim(),
        ])
      );

      // 4️⃣ Merge result
      const minimalData = employees.map((emp) => ({
        id: emp.user_id,
        name: profileMap.get(String(emp.user_id)) || "N/A",
        designation: emp.designation,
      }));

      return res.status(200).json({
        success: true,
        data: minimalData,
      });
    } catch (err: any) {
      console.error("❌ Error in getAllEmployeesMinimal:", err.message);
      return res.status(500).json({
        success: false,
        message: "Server error while fetching minimal employee list.",
      });
    }
  }

  async getEmployeeById(req: Request, res: Response) {
    try {
      const { id } = req.params; // This is user_id (from User model)

      // 1️⃣ Fetch Employee Profile with basic User info
      const employeeProfile = await EmployeeProfileModel.findOne({
        user_id: id,
      })
        .populate({
          path: "user_id",
          select: "name email role is_active",
        })
        .lean();

      if (!employeeProfile) {
        return res.status(404).json({
          success: false,
          message: "❌ Employee profile not found.",
        });
      }

      // 2️⃣ Fetch User Profile & Salary concurrently
      const [userProfile, salary] = await Promise.all([
        UserProfileModel.findOne({ user_id: id }).lean(),
        EmployeeSalaryModel.findOne({ employee_id: id }).lean(),
      ]);

      // 3️⃣ Compose Final Response
      const responsePayload = {
        employee_profile: {
          ...employeeProfile,
          user: employeeProfile.user_id || {},
        },
        user_profile: userProfile || {},
        salary: salary || {},
      };

      return res.status(200).json({
        success: true,
        data: responsePayload,
      });
    } catch (err: any) {
      console.error("❌ Error in getEmployeeById:", err.message);
      return res.status(500).json({
        success: false,
        message: "💥 Server error while fetching employee details.",
      });
    }
  }
}

export const employerController = new EmployerController();
