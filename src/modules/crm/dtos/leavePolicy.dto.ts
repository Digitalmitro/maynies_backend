import { z } from "zod";

export const leavePolicySchema = z.object({
    year: z
        .number()
        .min(2020, "Year must be greater than 2020")
        .max(2100, "Year must be less than 2100"),

    vacation_days: z
        .number()
        .min(0, "Vacation days cannot be negative")
        .default(12),

    sick_days: z
        .number()
        .min(0, "Sick days cannot be negative")
        .default(8),

    casual_days: z
        .number()
        .min(0, "Casual days cannot be negative")
        .default(3),

    holidays: z
        .array(
            z.object({
                date: z.string().refine(
                    (val) => !isNaN(Date.parse(val)),
                    "Invalid date format (must be ISO string)"
                ),
                name: z.string().min(1, "Holiday name cannot be empty")
            })
        )
        .optional()
        .default([])
});


export type LeavePolicyInput = z.infer<typeof leavePolicySchema>;