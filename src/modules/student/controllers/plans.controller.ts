import { NextFunction, Response, Request } from "express";
import { CreatePlanDto } from "../dtos/createPlan.dto";
import { Plan } from "../models/plan.model";
import { CreateStudentPlanDto } from "../dtos/studentEnrollPlan.dto";
import { StudentProfileModel } from "../models/studentProfile.model";
import { StudentPlan } from "../models/studentPlan.model";
import { Payment } from "../models/planPayment.model";
import { createOfflinePaymentSchema } from "../dtos/studentPaymentRequest.dto";
import mongoose from "mongoose";
import { CourseEnrollmentModel } from "../../courses/models/courseEnrollment.model";

class PlanController {
  // admin

  async createPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = req.body; // already validated by zod

      const plan = new Plan(data);
      await plan.save();

      return res.status(201).json({
        success: true,
        message: "Plan created successfully",
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const { paymentMode, status } = req.query;

      const filter: any = {};

      // ✅ paymentMode filter
      if (
        paymentMode &&
        ["one_time", "installments", "both"].includes(paymentMode as string)
      ) {
        filter.paymentMode = paymentMode;
      }

      // ✅ status filter
      if (status && ["active", "inactive"].includes(status as string)) {
        filter.status = status;
      }

      const plans = await Plan.find(filter).sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        count: plans.length,
        filters: filter,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

   async getPlanDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const plan = await Plan.findById(id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Plan not found",
        });
      }

      return res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

 async getEnrollmentPlansAdmin(req: Request, res: Response, next: NextFunction) {
try {
    const enrollments = await StudentPlan.find()
      .populate("planId")
      .populate("studentId");

    return res.json({
      success: true,
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
}
  
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
  async createStudentPlan(
    req: Request<{}, {}, CreateStudentPlanDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { planId, chosenMode } = req.body;
      const caller = req.user; // user object from authenticate middleware

      // Student ID decide karo
      const studentId = caller?.user?._id;

      console.log(studentId);

      if (!studentId) {
        return res.status(403).json({
          success: false,
          error: "Only students can enroll in plans",
        });
      }

      // Plan aur Student existence check
      const [student, plan] = await Promise.all([
        StudentProfileModel.findOne({ user_id: studentId }),
        Plan.findById(planId).lean(),
      ]);

      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student not found" });
      }
      if (!plan || plan.status !== "active") {
        return res.status(404).json({
          success: false,
          error: "Plan not found or inactive",
        });
      }

      // Payment mode compatibility check
      if (
        chosenMode === "installments" &&
        !(plan.paymentMode === "installments" || plan.paymentMode === "both")
      ) {
        return res.status(400).json({
          success: false,
          error: "Plan does not support installments",
        });
      }
      if (
        chosenMode === "one_time" &&
        !(plan.paymentMode === "one_time" || plan.paymentMode === "both")
      ) {
        return res.status(400).json({
          success: false,
          error: "Plan does not support one-time payments",
        });
      }

      // Duplicate enrollment check
      const alreadyEnrolled = await StudentPlan.findOne({
        studentId,
        planId,
        status: "active",
      });
      if (alreadyEnrolled) {
        return res.status(409).json({
          success: false,
          error: "Already enrolled in this plan",
        });
      }

      // Installments snapshot agar mode installments hai
      let installmentSnapshot = undefined;
      if (chosenMode === "installments") {
        if (!plan.installmentAmounts || plan.installmentAmounts.length === 0) {
          return res.status(400).json({
            success: false,
            error: "No installment schedule found for this plan",
          });
        }
        installmentSnapshot = plan.installmentAmounts.map((it: any) => ({
          amount: it.amount,
          dueDate: it.dueDate,
          paid: false,
          paidAmount: 0,
          paidAt: null,
        }));
      }

      // StudentPlan create
      const studentPlan = await StudentPlan.create({
        studentId,
        planId,
        chosenMode,
        assignedAt: new Date(),
        status: "active",
        installmentSchedule: installmentSnapshot, // optional field if in schema
      });

      return res.status(201).json({
        success: true,
        message: "Enrolled successfully",
        data: studentPlan,
      });
    } catch (err) {
      next(err);
    }
  }

  async getPlansForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await Plan.find({ status: "active" }).lean();
      res.json({ success: true, plans });
    } catch (err) {
      next(err);
    }
  }

  async planDetailForStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const plan = await Plan.findById(id).lean();

      if (!plan || plan.status !== "active") {
        return res
          .status(404)
          .json({ success: false, error: "Plan not found" });
      }

      res.json({ success: true, plan });
    } catch (err) {
      next(err);
    }
  }
  async enrollmentPlanDetailForStudent(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { id } = req.params;
      const studentId = req.user?.user?._id; // From auth middleware
      const plan = await Plan.findById(id).lean();
      const enrolledPlans = await StudentPlan.find({ studentId })
        .populate("planId") // Populates Plan details
        .lean();

      if (!plan || !enrolledPlans || plan.status !== "active") {
        return res
          .status(404)
          .json({ success: false, error: "Plan not found" });
      }
      res.json({ success: true, plan, enrolledPlans });
    } catch (err) {
      next(err);
    }
  }

  async getEnrollmentPlans(req: Request, res: Response,next: NextFunction) {
   try {
    const studentId = req.user?.user?._id; // auth se aayega

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Student not found",
      });
    }

    const enrollments = await StudentPlan.find({ studentId })
      .populate("planId")
      .populate("studentId");

    return res.json({
      success: true,
      data: enrollments,
    });
  } catch (err) {
    next(err);
  }
  }

  async createOfflnePayment(req: Request, res: Response) {
    try {
      // Validate body with Zod
      const parsedData = createOfflinePaymentSchema.parse(req.body);

      const {
        studentId,
        studentPlanId,
        amount,
        currency,
        installmentNumber,
        totalInstallments,
        paymentMethod,
        transactionId,
        proofUrl,
        remarks,
      } = parsedData;

      // Check if student plan exists
      const studentPlan = await StudentPlan.findById(studentPlanId);
      if (!studentPlan) {
        return res.status(404).json({ message: "Student plan not found" });
      }

      // Verify studentId matches plan's studentId
      if (studentPlan.studentId.toString() !== studentId) {
        return res
          .status(400)
          .json({ message: "Student ID does not match the plan" });
      }

      // Handle installment logic
      if (studentPlan.chosenMode === "installments") {
        if (!installmentNumber || !totalInstallments) {
          return res.status(400).json({
            message: "Installment details are required for installment mode",
          });
        }
      }

      // Create payment
      const payment = await Payment.create({
        studentId,
        studentPlanId,
        amount,
        currency,
        installmentNumber:
          studentPlan.chosenMode === "installments"
            ? installmentNumber
            : undefined,
        totalInstallments:
          studentPlan.chosenMode === "installments"
            ? totalInstallments
            : undefined,
        paymentMethod,
        transactionId,
        proofUrl,
        status: "pending",
        remarks,
      });

      return res.status(201).json({
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      return res.status(500).json({ message: "Internal server error" });
    }
  }

  async getAllRequests(req: Request, res: Response) {
    try {
      const { status } = req.query;

      const filter: any = {};
      if (
        status &&
        ["pending", "approved", "rejected"].includes(status as string)
      ) {
        filter.status = status;
      }

      const payments = await Payment.find(filter)
        .populate("studentId", "name email") // sirf kuch fields
        .populate("studentPlanId", "planId chosenMode status")
        .sort({ createdAt: -1 });

      return res.json({
        message: "Payments fetched successfully",
        count: payments.length,
        data: payments,
      });
    } catch (err: any) {
      return res
        .status(500)
        .json({ message: err.message || "Internal server error" });
    }
  }

  async updatePaymentRequestStatus(req: Request, res: Response) {
    try {
      const { id } = req.params; // payment request id
      const { status, remarks } = req.body;

      if (!["approved", "rejected", "pending"].includes(status)) {
        return res.status(400).json({ message: "Invalid status value" });
      }

      const paymentRequest = await Payment.findById(id);
      if (!paymentRequest) {
        return res.status(404).json({ message: "Payment request not found" });
      }

      // update payment request
      paymentRequest.status = status;
      if (remarks) {
        paymentRequest.remarks = remarks;
      }
      await paymentRequest.save();

      // agar approve hai toh studentPlan complete kardo
      if (status === "approved") {
        await StudentPlan.findByIdAndUpdate(
          paymentRequest.studentPlanId, // assume Payment me studentPlanId stored hai
          { status: "completed" },
          { new: true }
        );
      }

      return res.status(200).json({
        message: `Payment request ${status} successfully`,
        data: paymentRequest,
      });
    } catch (error) {
      console.error("Error updating payment request:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

export const planController = new PlanController();
