import { z } from "zod";

export const createLoanRequestSchema = z.object({

    amount: z.string({
        required_error: "Amount is required",
        invalid_type_error: "Amount must be a string",
    }).min(1000, "Amount should be at least ₹1000"),

    durationMonths: z.string({
        required_error: "Duration is required",
        invalid_type_error: "Duration must be a string",
    }).min(1, "Duration must be at least 1 month"),

    reason: z.string().min(10, "Reason must be at least 10 characters long").optional(),
    notes: z.string().min(10, "notes must be at least 10 characters long").optional(),

});

export type CreateLoanRequestInput = z.infer<typeof createLoanRequestSchema>;
