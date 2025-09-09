// dtos/getPlans.dto.ts
import { z } from "zod";

export const GetPlansQueryDTO = z.object({
  page: z.string().transform((v) => Math.max(1, parseInt(v))).optional(),
  limit: z.string().transform((v) => Math.min(50, Math.max(1, parseInt(v)))).optional(), // cap 50
  search: z.string().trim().optional(),
  paymentType: z.string().trim().optional(),               // "tuition" | "hostel" | "exam" | custom
  paymentMode: z.enum(["one_time", "installments", "both"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  minAmount: z.string().transform((v) => Number(v)).optional(),
  maxAmount: z.string().transform((v) => Number(v)).optional(),
  hasInstallments: z.enum(["true", "false"]).optional(),
  sortBy: z.enum(["createdAt","updatedAt","totalAmount","name"]).optional(),
  sortOrder: z.enum(["asc","desc"]).optional(),
});

export type GetPlansQuery = z.infer<typeof GetPlansQueryDTO>;
