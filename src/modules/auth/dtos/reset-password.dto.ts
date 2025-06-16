// src/modules/auth/dtos/reset-password.dto.ts
import { z } from 'zod';

export const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(6, 'Password should be at least 6 characters'),
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
