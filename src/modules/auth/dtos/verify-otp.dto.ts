// src/schemas/auth.schemas.ts
import { z } from 'zod';

export const verifyOtpSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    otp: z
        .string()
        .length(6, { message: 'OTP must be 6 digits' })
        .regex(/^\d{6}$/, { message: 'OTP must contain only numbers' }),
});

export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
