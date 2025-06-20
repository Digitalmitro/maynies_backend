import { z } from 'zod';

export const updateEmployerProfileSchema = z.object({
    // User Profile
    first_name: z.string().min(1).max(50).optional(),
    last_name: z.string().min(1).max(50).optional(),
    avatar_url: z.string().url().optional(),
    bio: z.string().max(300).optional(),

    // Employer Profile
    designation: z.string().min(2).max(100).optional(),
    mobile_number: z.string().min(8).max(20).optional(),
    work_number: z.string().min(8).max(20).optional(),
    location: z.string().min(2).max(100).optional(),
    date_of_joining: z.string().optional() // or z.coerce.date() if parsed
});
