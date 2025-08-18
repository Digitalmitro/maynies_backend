import { z } from "zod";

export const createOfflinePaymentSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  studentPlanId: z.string().min(1, "Student Plan ID is required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  currency: z.string().default("INR"),
  installmentNumber: z.number().optional(),
  totalInstallments: z.number().optional(),
  paymentMethod: z.enum(["cash", "bank_transfer", "upi"]),
  transactionId: z.string().optional(),
  proofUrl: z.string().optional(),
  remarks: z.string().optional(),
});

export type CreateOfflinePaymentDto = z.infer<
  typeof createOfflinePaymentSchema
>;
