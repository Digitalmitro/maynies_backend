// dtos/salary.dto.ts
import { z } from "zod";

export const SalaryUpdateSchema = z.object({
    base_salary: z
        .number({ required_error: "Base salary is required" })
        .min(0, "Base salary must be a positive number"),

    bonuses: z
        .number()
        .min(0, "Bonus can't be negative")
        .optional()
        .default(0),

    deductions: z
        .number()
        .min(0, "Deductions can't be negative")
        .optional()
        .default(0),

    pay_cycle: z
        .enum(["monthly", "bi-weekly", "weekly"], {
            required_error: "Pay cycle must be one of: monthly, bi-weekly, weekly",
        }),

    effective_from: z
        .string()
        .refine((val) => !isNaN(Date.parse(val)), {
            message: "effective_from must be a valid date string",
        }),

    remarks: z
        .string()
        .max(300, "Remarks too long")
        .optional(),
});


export type SalaryUpdateInput = z.infer<typeof SalaryUpdateSchema>;