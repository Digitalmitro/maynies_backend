// src/modules/auth/dtos/forgot-password.dto.ts
import { z } from 'zod';

export const forgotPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
});