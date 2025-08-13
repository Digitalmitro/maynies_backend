import { z } from "zod";

export const createOfflinePaymentSchema = z.object({
  studentPlanId: z.string().regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid studentPlanId" }),
  amount: z.number().min(1, { message: "Amount must be at least 1" }),
  paymentMethod: z.enum(["cash", "bank_transfer", "upi"]),
  transactionId: z.string().optional(),
  proofUrl: z.string().url({ message: "Invalid proof URL" }).optional(),
  remarks: z.string().optional()
});

export type CreateOfflinePaymentDto = z.infer<typeof createOfflinePaymentSchema>;
