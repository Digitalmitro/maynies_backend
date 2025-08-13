import { NextFunction, Response, Request } from "express";
import { CreatePlanDto } from "../dtos/createPlan.dto";
import { Plan } from "../models/plan.model";
import { CreateStudentPlanDto } from "../dtos/studentEnrollPlan.dto";
import { StudentProfileModel } from "../models/studentProfile.model";
import { StudentPlan } from "../models/studentPlan.model";

class PlanController {
  // admin
  async createPlan(
    req: Request<{}, {}, CreatePlanDto>,
    res: Response,
    next: NextFunction
  ) {
    try {
      const data = req.body;

      // 1. Start & End Date check
      if (data.startDate && data.endDate) {
        const start = new Date(data.startDate);
        const end = new Date(data.endDate);
        if (end <= start) {
          return res.status(400).json({
            error: "End date must be after start date",
          });
        }
      }

      // 2. Payment Mode validations
      if (data.paymentMode === "installments" || data.paymentMode === "both") {
        if (data.installmentCount && data.installmentAmounts) {
          // Count check
          if (data.installmentAmounts.length !== data.installmentCount) {
            return res.status(400).json({
              error: "Installment count and amounts length must match",
            });
          }

          // Amount sum check
          const total = data.installmentAmounts.reduce(
            (sum, inst) => sum + inst.amount,
            0
          );
          if (total !== data.totalAmount) {
            return res.status(400).json({
              error: "Sum of installment amounts must equal totalAmount",
            });
          }

          // Positive values check
          if (data.installmentAmounts.some((i) => i.amount <= 0)) {
            return res.status(400).json({
              error: "Installment amounts must be positive",
            });
          }

          // Due date ascending check
          const sortedDates = [...data.installmentAmounts]
            .map((i) => new Date(i.dueDate))
            .sort((a, b) => a.getTime() - b.getTime());

          const isSorted = data.installmentAmounts.every(
            (inst, idx) =>
              new Date(inst.dueDate).getTime() === sortedDates[idx].getTime()
          );

          if (!isSorted) {
            return res.status(400).json({
              error: "Installment due dates must be in ascending order",
            });
          }

          // Check due dates within plan start/end date range (if provided)
          if (data.startDate && data.endDate) {
            const start = new Date(data.startDate);
            const end = new Date(data.endDate);

            const outOfRange = data.installmentAmounts.some((i) => {
              const due = new Date(i.dueDate);
              return due < start || due > end;
            });

            if (outOfRange) {
              return res.status(400).json({
                error:
                  "All installment due dates must fall within the plan's start and end date",
              });
            }
          }
        } else if (data.paymentMode === "installments") {
          return res.status(400).json({
            error:
              "Installment count and amounts are required when paymentMode is 'installments'",
          });
        }
      }

      // 3. Late Fee validations
      if (data.lateFeeType) {
        if (data.lateFeeValue == null) {
          return res.status(400).json({
            error: "Late fee value is required when lateFeeType is provided",
          });
        }
        if (
          data.lateFeeType === "percentage" &&
          (data.lateFeeValue < 0 || data.lateFeeValue > 100)
        ) {
          return res.status(400).json({
            error: "Late fee percentage must be between 0 and 100",
          });
        }
        if (data.lateFeeType === "fixed" && data.lateFeeValue < 0) {
          return res.status(400).json({
            error: "Late fee (fixed) must be a positive number",
          });
        }
      }

      // 4. Total amount sanity check
      if (data.totalAmount <= 0) {
        return res.status(400).json({
          error: "Total amount must be positive",
        });
      }

      // ✅ Save to DB
      const newPlan = await Plan.create(data);

      res.status(201).json({
        message: "Plan created successfully",
        plan: newPlan,
      });
    } catch (error) {
      next(error);
    }
  }
  async getPlansForAdmin(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        status, // optional: active/inactive
        search, // optional: search by name
        page = 1,
        limit = 10,
      } = req.query as {
        status?: string;
        search?: string;
        page?: string | number;
        limit?: string | number;
      };

      const filter: any = {};
      if (status) filter.status = status;
      if (search) filter.name = { $regex: search, $options: "i" };

      const skip = (Number(page) - 1) * Number(limit);

      const [plans, total] = await Promise.all([
        Plan.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .lean(),
        Plan.countDocuments(filter),
      ]);

      return res.status(200).json({
        success: true,
        data: plans,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit)),
        },
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
      if (!studentId) {
        return res.status(403).json({
          success: false,
          error: "Only students can enroll in plans",
        });
      }

      // Plan aur Student existence check
      const [student, plan] = await Promise.all([
        StudentProfileModel.findById(studentId),
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
        return res
          .status(400)
          .json({
            success: false,
            error: "Plan does not support installments",
          });
      }
      if (
        chosenMode === "one_time" &&
        !(plan.paymentMode === "one_time" || plan.paymentMode === "both")
      ) {
        return res
          .status(400)
          .json({
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

  async planDetailForStudent (req: Request, res: Response, next: NextFunction)  {
  try {
    const { id } = req.params;
    const plan = await Plan.findById(id).lean();

    if (!plan || plan.status !== "active") {
      return res.status(404).json({ success: false, error: "Plan not found" });
    }

    res.json({ success: true, plan });
  } catch (err) {
    next(err);
  }
}
}

export const planController = new PlanController();
