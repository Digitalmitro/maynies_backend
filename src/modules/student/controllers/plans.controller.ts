import { NextFunction, Response, Request } from "express";
// import { CreatePlanDto } from "../dtos/createPlan.dto";
import { Plan } from "../models/plan.model";
import { CreateStudentPlanDto } from "../dtos/studentEnrollPlan.dto";
import { StudentProfileModel } from "../models/studentProfile.model";
import { StudentPlanEnrollment } from "../models/studentPlanEnrollments.model";
import { StudentPlanPayment } from "../models/planPayment.model";
import { createOfflinePaymentSchema } from "../dtos/studentPaymentRequest.dto";
import mongoose from "mongoose";
import { CourseEnrollmentModel } from "../../courses/models/courseEnrollment.model";
import { CreatePlanDTO } from "../dtos/createPlan.dto";
import { GetPlansQuery } from "../dtos/getPlan.dto";
import { UserProfileModel } from "../../user/models/userProfile.model";

class PlanController {
  // admin

  async createPlan(req: Request, res: Response) {
    const body: CreatePlanDTO = req.body;
    try {
      // ✅ body pehle hi DTO se validate ho chuki hai, type-safe
      const {
        name,
        description,
        paymentType,
        totalAmount,
        paymentMode,
        status,
        installments = [],
      } = body;

      // 1️⃣ Payment mode logic
      let installmentAmounts: { amount: number; dueDate: Date }[] = [];

      if (paymentMode === "installments" || paymentMode === "both") {
        if (installments.length < 2) {
          return res
            .status(400)
            .json({ message: "At least 2 installments required" });
        }

        // sum validation
        const sum = installments.reduce((acc, i) => acc + i.amount, 0);
        if (sum !== totalAmount) {
          return res
            .status(400)
            .json({ message: "Installments sum must equal totalAmount" });
        }

        // map to schema format
        installmentAmounts = installments.map((i) => ({
          amount: i.amount,
          dueDate: new Date(i.dueDate),
        }));
      }

      // 2️⃣ Create Plan
      const plan = new Plan({
        name,
        description,
        paymentType,
        totalAmount,
        paymentMode,
        status,
        installmentAmounts,
      });

      await plan.save();

      return res
        .status(201)
        .json({ message: "Plan created successfully", plan });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async getPlans(req: Request, res: Response) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        paymentType,
        paymentMode,
        status,
        minAmount,
        maxAmount,
        hasInstallments,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query as unknown as GetPlansQuery;

      // 1) Filters
      const filter: Record<string, any> = {
        deletedAt: null, // ✅ only active (not deleted)
      };

      if (status) filter.status = status;
      if (paymentMode) filter.paymentMode = paymentMode;
      if (paymentType) filter.paymentType = paymentType;

      if (typeof minAmount === "number" && !Number.isNaN(minAmount)) {
        filter.totalAmount = { ...(filter.totalAmount || {}), $gte: minAmount };
      }
      if (typeof maxAmount === "number" && !Number.isNaN(maxAmount)) {
        filter.totalAmount = { ...(filter.totalAmount || {}), $lte: maxAmount };
      }

      // hasInstallments=true => at least one installment
      if (hasInstallments === "true")
        filter["installmentAmounts.0"] = { $exists: true };
      if (hasInstallments === "false")
        filter["installmentAmounts"] = { $size: 0 };

      // text-ish search on name/description
      if (search && search.trim().length) {
        const rx = new RegExp(search.trim(), "i");
        filter.$or = [{ name: rx }, { description: rx }];
      }

      // 2) Sorting
      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      // 3) Pagination
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      // 4) Query (lean for speed)
      const [items, total] = await Promise.all([
        Plan.find(filter).sort(sort).skip(skip).limit(limitNum).lean().select({
          name: 1,
          description: 1,
          paymentType: 1,
          totalAmount: 1,
          paymentMode: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        }),
        Plan.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        data: items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        filters: filter, // helpful for debugging on admin
        sort: { sortBy, sortOrder },
      });
    } catch (err) {
      console.error("getPlans error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async getPlanDetailById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id);

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json({ data: plan });
    } catch (error) {
      console.error("❌ Error fetching plan:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  async updatePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const plan = await Plan.findByIdAndUpdate(id, updates, {
        new: true,
        runValidators: true, // ✅ ensure mongoose validations run
      });

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json({ message: "Plan updated successfully", data: plan });
    } catch (error) {
      console.error("❌ Error updating plan:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // DELETE (soft delete)
  async deletePlan(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id);
      if (!plan || plan.deletedAt) {
        return res.status(404).json({ message: "Plan not found" });
      }

      plan.deletedAt = new Date();
      await plan.save();

      res.status(200).json({ message: "Plan deleted successfully" });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error deleting plan", error: error.message });
    }
  }

  async getEnrollmentsByPlanId(req: Request, res: Response) {
    try {
      const { planId } = req.params;

      // query params
      const {
        status = "pending", // default filter
        search = "", // student name search
        page = 1,
        limit = 10,
      } = req.query;

      // base filter
      const filter: any = { planId };
      if (status) {
        filter.status = status; // pending, approved, rejected
      }

      // get enrollments
      const skip = (Number(page) - 1) * Number(limit);

      // enrollments fetch
      const enrollments = await StudentPlanEnrollment.find(filter)
        .sort({ createdAt: -1 }) // latest first
        .skip(skip)
        .limit(Number(limit))
        .lean();

      // Student IDs
      const studentIds = enrollments.map((e) => e.studentId);
      console.log(studentIds);
      // fetch student profiles separately
      const profiles = await UserProfileModel.find(
        {
          user_id: { $in: studentIds }, // ✅ yeh sahi hoga
          ...(search ? { first_name: { $regex: search, $options: "i" } } : {}),
        },
        { user_id: 1, first_name: 1, last_name: 1 }
      ).lean();

      console.log(profiles);

      // map profiles
      const profileMap = profiles.reduce<Record<string, string>>((acc, p) => {
        acc[String(p.user_id)] = `${p.first_name} ${p.last_name}`;
        return acc;
      }, {});
      console.log(profileMap);
      console.log(enrollments);

      // merge profile names with enrollments
      const result = enrollments.map((en) => ({
        ...en,
        studentName: profileMap[String(en.studentId)] || "Unknown",
      }));

      // count for pagination
      const total = await StudentPlanEnrollment.countDocuments(filter);

      res.json({
        success: true,
        data: result,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async  updateEnrollmentStatus  (req: Request, res: Response)  {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      // validate input
      if (!["enrolled", "rejected", "cancelled"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }
  
      // enrollment find kar
      const enrollment = await StudentPlanEnrollment.findById(id);
      if (!enrollment) {
        return res.status(404).json({ message: "Enrollment not found" });
      }
  
      // status map
      const statusMap: Record<string, string> = {
        "enrolled": "enrolled",
        'rejected': "rejected",
        "cancelled": "cancelled",
      };
  
      enrollment.status = statusMap[status] as "enrolled" | "rejected" | "cancelled";
      await enrollment.save();
  
      res.json({
        message: `Enrollment status updated to ${enrollment.status}`,
        enrollment,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  };

  // async getEnrollmentPlansAdmin(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     const enrollments = await StudentPlan.find()
  //       .populate("planId")
  //       .populate("studentId");

  //     return res.json({
  //       success: true,
  //       data: enrollments,
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  //student
  //     async createStudentPlan(
  //     req:Request<{}, {},CreateStudentPlanDto>,
  //     res: Response,
  //     next: NextFunction
  //   ) {
  //     try {
  //       const { planId, chosenMode } = req.body;
  //       const caller = req.user;
  //       const studentIdFromBody = req.body.studentId;

  //       // decide studentId
  //       let studentId: string | undefined;
  //       if (caller && caller.role === "student") {
  //         studentId = caller.id;
  //       } else if (studentIdFromBody) {
  //         studentId = studentIdFromBody;
  //       } else {
  //         return res.status(400).json({
  //           success: false,
  //           error: "studentId is required when called by non-student",
  //         });
  //       }

  //       // basic existence checks
  //       const [student, plan] = await Promise.all([
  //         Student.findById(studentId),
  //         Plan.findById(planId).lean(),
  //       ]);

  //       if (!student) {
  //         return res.status(404).json({ success: false, error: "Student not found" });
  //       }
  //       if (!plan || plan.status !== "active") {
  //         return res.status(404).json({ success: false, error: "Plan not found or not active" });
  //       }

  //       // chosenMode compatibility with plan.paymentMode
  //       // plan.paymentMode values: "one_time" | "installments" | "both"
  //       if (chosenMode === "installments" && !(plan.paymentMode === "installments" || plan.paymentMode === "both")) {
  //         return res.status(400).json({
  //           success: false,
  //           error: "Plan does not support installments",
  //         });
  //       }
  //       if (chosenMode === "one_time" && !(plan.paymentMode === "one_time" || plan.paymentMode === "both")) {
  //         return res.status(400).json({
  //           success: false,
  //           error: "Plan does not support one-time payments",
  //         });
  //       }

  //       // prevent duplicate active enrollment
  //       const already = await StudentPlan.findOne({
  //         studentId,
  //         planId,
  //         status: "active",
  //       });
  //       if (already) {
  //         return res.status(409).json({
  //           success: false,
  //           error: "Student is already enrolled in this plan",
  //         });
  //       }

  //       // If installments chosen, ensure plan has schedule; snapshot it into studentPlan
  //       let installmentSnapshot = undefined;
  //       if (chosenMode === "installments") {
  //         const planInst = plan.installmentAmounts;
  //         if (!planInst || !Array.isArray(planInst) || planInst.length === 0) {
  //           return res.status(400).json({
  //             success: false,
  //             error: "Selected plan does not have installment schedule configured",
  //           });
  //         }

  //         // optional sanity checks (amounts positive etc.)
  //         const anyNonPositive = planInst.some((i: any) => !i.amount || i.amount <= 0);
  //         if (anyNonPositive) {
  //           return res.status(400).json({
  //             success: false,
  //             error: "Plan installment amounts must be positive numbers",
  //           });
  //         }

  //         // snapshot to save schedule for this student (paid:false initially)
  //         installmentSnapshot = planInst.map((it: any) => ({
  //           amount: it.amount,
  //           dueDate: it.dueDate,
  //           paid: false,
  //           paidAmount: 0,
  //           paidAt: null,
  //         }));
  //       }

  //       // create studentPlan
  //       const studentPlanDoc = await StudentPlan.create({
  //         studentId,
  //         planId,
  //         chosenMode,
  //         assignedAt: new Date(),
  //         status: "active",
  //         // NOTE: If your StudentPlan schema doesn't have `installmentSchedule` yet,
  //         // add an optional field there. See note below.
  //         installmentSchedule: installmentSnapshot,
  //       });

  //       return res.status(201).json({
  //         success: true,
  //         message: "Student enrolled in plan successfully",
  //         studentPlan: studentPlanDoc,
  //       });
  //     } catch (err) {
  //       next(err);
  //     }
  //   }
  // async createStudentPlan(
  //   req: Request<{}, {}, CreateStudentPlanDto>,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     const { planId, chosenMode } = req.body;
  //     const caller = req.user; // user object from authenticate middleware

  //     // Student ID decide karo
  //     const studentId = caller?.user?._id;

  //     console.log(studentId);

  //     if (!studentId) {
  //       return res.status(403).json({
  //         success: false,
  //         error: "Only students can enroll in plans",
  //       });
  //     }

  //     // Plan aur Student existence check
  //     const [student, plan] = await Promise.all([
  //       StudentProfileModel.findOne({ user_id: studentId }),
  //       Plan.findById(planId).lean(),
  //     ]);

  //     if (!student) {
  //       return res
  //         .status(404)
  //         .json({ success: false, error: "Student not found" });
  //     }
  //     if (!plan || plan.status !== "active") {
  //       return res.status(404).json({
  //         success: false,
  //         error: "Plan not found or inactive",
  //       });
  //     }

  //     // Payment mode compatibility check
  //     if (
  //       chosenMode === "installments" &&
  //       !(plan.paymentMode === "installments" || plan.paymentMode === "both")
  //     ) {
  //       return res.status(400).json({
  //         success: false,
  //         error: "Plan does not support installments",
  //       });
  //     }
  //     if (
  //       chosenMode === "one_time" &&
  //       !(plan.paymentMode === "one_time" || plan.paymentMode === "both")
  //     ) {
  //       return res.status(400).json({
  //         success: false,
  //         error: "Plan does not support one-time payments",
  //       });
  //     }

  //     // Duplicate enrollment check
  //     const alreadyEnrolled = await StudentPlan.findOne({
  //       studentId,
  //       planId,
  //       status: "active",
  //     });
  //     if (alreadyEnrolled) {
  //       return res.status(409).json({
  //         success: false,
  //         error: "Already enrolled in this plan",
  //       });
  //     }

  //     // Installments snapshot agar mode installments hai
  //     let installmentSnapshot = undefined;
  //     if (chosenMode === "installments") {
  //       if (!plan.installmentAmounts || plan.installmentAmounts.length === 0) {
  //         return res.status(400).json({
  //           success: false,
  //           error: "No installment schedule found for this plan",
  //         });
  //       }
  //       installmentSnapshot = plan.installmentAmounts.map((it: any) => ({
  //         amount: it.amount,
  //         dueDate: it.dueDate,
  //         paid: false,
  //         paidAmount: 0,
  //         paidAt: null,
  //       }));
  //     }

  //     // StudentPlan create
  //     const studentPlan = await StudentPlan.create({
  //       studentId,
  //       planId,
  //       chosenMode,
  //       assignedAt: new Date(),
  //       status: "active",
  //       installmentSchedule: installmentSnapshot, // optional field if in schema
  //     });

  //     return res.status(201).json({
  //       success: true,
  //       message: "Enrolled successfully",
  //       data: studentPlan,
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  async getPlansForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        paymentType,
        paymentMode,
        status,
        minAmount,
        maxAmount,
        hasInstallments,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query as unknown as GetPlansQuery;

      // 1) Filters
      const filter: Record<string, any> = {
        deletedAt: null, // ✅ only active (not deleted)
      };

      if (status) filter.status = status;
      if (paymentMode) filter.paymentMode = paymentMode;
      if (paymentType) filter.paymentType = paymentType;

      if (typeof minAmount === "number" && !Number.isNaN(minAmount)) {
        filter.totalAmount = { ...(filter.totalAmount || {}), $gte: minAmount };
      }
      if (typeof maxAmount === "number" && !Number.isNaN(maxAmount)) {
        filter.totalAmount = { ...(filter.totalAmount || {}), $lte: maxAmount };
      }

      // hasInstallments=true => at least one installment
      if (hasInstallments === "true")
        filter["installmentAmounts.0"] = { $exists: true };
      if (hasInstallments === "false")
        filter["installmentAmounts"] = { $size: 0 };

      // text-ish search on name/description
      if (search && search.trim().length) {
        const rx = new RegExp(search.trim(), "i");
        filter.$or = [{ name: rx }, { description: rx }];
      }

      // 2) Sorting
      const sort: Record<string, 1 | -1> = {
        [sortBy]: sortOrder === "asc" ? 1 : -1,
      };

      // 3) Pagination
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const skip = (pageNum - 1) * limitNum;

      // 4) Query (lean for speed)
      const [items, total] = await Promise.all([
        Plan.find(filter).sort(sort).skip(skip).limit(limitNum).lean().select({
          name: 1,
          description: 1,
          paymentType: 1,
          totalAmount: 1,
          paymentMode: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
        }),
        Plan.countDocuments(filter),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      return res.status(200).json({
        data: items,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
        filters: filter, // helpful for debugging on admin
        sort: { sortBy, sortOrder },
      });
    } catch (err) {
      console.error("getPlans error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async planDetailForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params; // planId
      const studentId = req?.user?.user?._id; // maan le JWT se aaya hai

      const plan = await Plan.findById(id);

      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      // Default status -> "not_enrolled"
      let enrolledstatus: string = "not_enrolled";

      if (studentId) {
        // Check if student already enrolled/requested
        const enrollment = await StudentPlanEnrollment.findOne({
          studentId,
          planId: id,
        });
        console.log(enrollment);

        if (enrollment) {
          enrolledstatus = enrollment.status; // "pending" | "enrolled" | "completed" | "cancelled"
        }
      }

      res.json({
        data: {
          ...plan.toObject(),
          enrolledstatus, // extra calculated field
        },
      });
    } catch (error) {
      console.error("❌ Error fetching plan:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }

  // async enrollmentPlanDetailForStudent(
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ) {
  //   try {
  //     const { id } = req.params;
  //     const studentId = req.user?.user?._id; // From auth middleware
  //     const plan = await Plan.findById(id).lean();
  //     const enrolledPlans = await StudentPlan.find({ studentId })
  //       .populate("planId") // Populates Plan details
  //       .lean();

  //     if (!plan || !enrolledPlans || plan.status !== "active") {
  //       return res
  //         .status(404)
  //         .json({ success: false, error: "Plan not found" });
  //     }
  //     res.json({ success: true, plan, enrolledPlans });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  // async getEnrollmentPlans(req: Request, res: Response, next: NextFunction) {
  //   try {
  //     const studentId = req.user?.user?._id; // auth se aayega

  //     if (!studentId) {
  //       return res.status(401).json({
  //         success: false,
  //         message: "Unauthorized: Student not found",
  //       });
  //     }

  //     const enrollments = await StudentPlan.find({ studentId })
  //       .populate("planId")
  //       .populate("studentId");

  //     return res.json({
  //       success: true,
  //       data: enrollments,
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }

  // async createOfflnePayment(req: Request, res: Response) {
  //   try {
  //     // Validate body with Zod
  //     const parsedData = createOfflinePaymentSchema.parse(req.body);

  //     const {
  //       studentId,
  //       studentPlanId,
  //       amount,
  //       currency,
  //       installmentNumber,
  //       totalInstallments,
  //       paymentMethod,
  //       transactionId,
  //       proofUrl,
  //       remarks,
  //     } = parsedData;

  //     // Check if student plan exists
  //     const studentPlan = await StudentPlan.findById(studentPlanId);
  //     if (!studentPlan) {
  //       return res.status(404).json({ message: "Student plan not found" });
  //     }

  //     // Verify studentId matches plan's studentId
  //     if (studentPlan.studentId.toString() !== studentId) {
  //       return res
  //         .status(400)
  //         .json({ message: "Student ID does not match the plan" });
  //     }

  //     // Handle installment logic
  //     if (studentPlan.chosenMode === "installments") {
  //       if (!installmentNumber || !totalInstallments) {
  //         return res.status(400).json({
  //           message: "Installment details are required for installment mode",
  //         });
  //       }
  //     }

  //     // Create payment
  //     const payment = await Payment.create({
  //       studentId,
  //       studentPlanId,
  //       amount,
  //       currency,
  //       installmentNumber:
  //         studentPlan.chosenMode === "installments"
  //           ? installmentNumber
  //           : undefined,
  //       totalInstallments:
  //         studentPlan.chosenMode === "installments"
  //           ? totalInstallments
  //           : undefined,
  //       paymentMethod,
  //       transactionId,
  //       proofUrl,
  //       status: "pending",
  //       remarks,
  //     });

  //     return res.status(201).json({
  //       message: "Payment recorded successfully",
  //       data: payment,
  //     });
  //   } catch (error) {
  //     if (error instanceof Error) {
  //       return res.status(400).json({ message: error.message });
  //     }
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }

  // async getAllRequests(req: Request, res: Response) {
  //   try {
  //     const { status } = req.query;

  //     const filter: any = {};
  //     if (
  //       status &&
  //       ["pending", "approved", "rejected"].includes(status as string)
  //     ) {
  //       filter.status = status;
  //     }

  //     const payments = await Payment.find(filter)
  //       .populate("studentId", "name email") // sirf kuch fields
  //       .populate("studentPlanId", "planId chosenMode status")
  //       .sort({ createdAt: -1 });

  //     return res.json({
  //       message: "Payments fetched successfully",
  //       count: payments.length,
  //       data: payments,
  //     });
  //   } catch (err: any) {
  //     return res
  //       .status(500)
  //       .json({ message: err.message || "Internal server error" });
  //   }
  // }

  // async updatePaymentRequestStatus(req: Request, res: Response) {
  //   try {
  //     const { id } = req.params; // payment request id
  //     const { status, remarks } = req.body;

  //     if (!["approved", "rejected", "pending"].includes(status)) {
  //       return res.status(400).json({ message: "Invalid status value" });
  //     }

  //     const paymentRequest = await Payment.findById(id);
  //     if (!paymentRequest) {
  //       return res.status(404).json({ message: "Payment request not found" });
  //     }

  //     // update payment request
  //     paymentRequest.status = status;
  //     if (remarks) {
  //       paymentRequest.remarks = remarks;
  //     }
  //     await paymentRequest.save();

  //     // agar approve hai toh studentPlan complete kardo
  //     if (status === "approved") {
  //       await StudentPlan.findByIdAndUpdate(
  //         paymentRequest.studentPlanId, // assume Payment me studentPlanId stored hai
  //         { status: "completed" },
  //         { new: true }
  //       );
  //     }

  //     return res.status(200).json({
  //       message: `Payment request ${status} successfully`,
  //       data: paymentRequest,
  //     });
  //   } catch (error) {
  //     console.error("Error updating payment request:", error);
  //     return res.status(500).json({ message: "Internal server error" });
  //   }
  // }

  async studentEnrollPlan(req: Request, res: Response) {
    try {
      const { planId, paymentMode } = req.body;
      const studentId = req?.user?.user?._id; // मान लो middleware se user inject ho raha hai

      // Step 1: Validate Plan
      const plan = await Plan.findById(planId);
      if (!plan || plan.status !== "active") {
        return res
          .status(404)
          .json({ success: false, message: "Plan not found or inactive" });
      }

      // Step 2: Validate Payment Mode
      if (plan.paymentMode !== paymentMode && plan.paymentMode !== "both") {
        return res.status(400).json({
          success: false,
          message: "Invalid payment mode for this plan",
        });
      }

      // Step 3: Create Enrollment
      const enrollment = await StudentPlanEnrollment.create({
        studentId,
        planId,
        paymentMode,
        status: "pending",
        assignedAt: new Date(),
      });

      // Step 4: Generate Payments
      let paymentsArray: any[] = [];

      if (paymentMode === "one_time") {
        paymentsArray.push({
          installmentNo: 1,
          amount: plan.totalAmount,
          dueDate: new Date(), // yahan tu apna logic daal sakta hai due date ka
          isPaid: false,
          status: "pending",
          paidAt: null,
        });
      } else if (paymentMode === "installments" && plan.installmentAmounts) {
        paymentsArray = plan.installmentAmounts.map((inst, idx) => ({
          installmentNo: idx + 1,
          amount: inst.amount,
          dueDate: inst.dueDate,
          isPaid: false,
          status: "pending",
          paidAt: null,
        }));
      }

      const studentPayment = await StudentPlanPayment.create({
        enrollmentId: enrollment._id,
        payments: paymentsArray,
        overallStatus: "incomplete",
      });

      // Step 5: Response
      return res.status(201).json({
        success: true,
        message: "Enrollment created successfully",
        data: {
          enrollmentId: enrollment._id,
          paymentId: studentPayment._id,
          status: enrollment.status,
        },
      });
    } catch (error: any) {
      console.error("Error in studentEnrollPlan:", error);
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
}

export const planController = new PlanController();
