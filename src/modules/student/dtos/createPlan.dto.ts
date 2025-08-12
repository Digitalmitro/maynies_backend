// src/modules/plans/dto/create-plan.dto.ts
import { z } from "zod";

export const InstallmentSchema = z.object({
  amount: z.number(),
  dueDate: z.string(),
});

export const CreatePlanSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  paymentType: z.string(),
  totalAmount: z.number(),
  paymentMode: z.enum(["one_time", "installments", "both"]),
  installmentCount: z.number().optional(),
  installmentAmounts: z.array(InstallmentSchema).optional(),
  lateFeeType: z.enum(["fixed", "percentage"]).optional(),
  lateFeeValue: z.number().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;
