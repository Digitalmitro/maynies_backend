// src/modules/auth/dtos/login.dto.ts
import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password should be at least 6 characters'),
});
export type LoginInput = z.infer<typeof loginSchema>;
