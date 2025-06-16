// src/modules/auth/dtos/register.dto.ts
import { z } from 'zod';

export const registerSchema = z.object({
    name: z.string(),
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(6, 'Password should be at least 6 characters'),
    role: z
        .string()

});

export type RegisterInput = z.infer<typeof registerSchema>;
