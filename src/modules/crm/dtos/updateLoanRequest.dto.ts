// dto/updateLoanRequest.dto.ts
import { z } from "zod";

export const updateLoanRequestSchema = z.object({
    amount: z.number().min(1000).optional(),
    durationMonths: z.number().min(1).optional(),
    reason: z.string().min(10).optional(),
    notes: z.string().min(10).optional(),
});

export type UpdateLoanRequestInput = z.infer<typeof updateLoanRequestSchema>;