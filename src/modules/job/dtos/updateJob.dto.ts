import { z } from "zod";

export const updateJobSchema = z.object({
    title: z.string().min(3),
    slug: z.string().min(10).max(300),
    short_description: z.string().min(10).max(300),
    description: z.string().min(20),
    location: z.string().min(2),
    job_type: z.enum(['full-time', 'part-time', 'internship']),
    experience: z.string().optional(),
    expires_at: z.string().refine(val => !isNaN(Date.parse(val)), {
        message: 'Invalid date format'
    }),
    salary_range: z
        .object({
            min: z.number().positive(),
            max: z.number().positive(),
            currency: z.string().length(3)
        })
        .optional(),
    requirements: z.array(z.string().min(2)).optional(),
    openings: z.number().int().positive().optional(),
    application_instructions: z.string().optional(),
    attachment_url: z.string().url().optional()
});
