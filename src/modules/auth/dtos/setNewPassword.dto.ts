import { z } from "zod";

export const setNewPasswordSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    newPassword: z
        .string()
        .min(8, { message: 'Password must be at least 8 characters' })
        .max(64)
        .regex(/[A-Z]/, { message: 'Must contain an uppercase letter' })
        .regex(/[a-z]/, { message: 'Must contain a lowercase letter' })
        .regex(/\d/, { message: 'Must contain a number' }),
});