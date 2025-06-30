import { z } from 'zod';

export const addToCartSchema = z.object({
    course_id: z.string().min(1)
});


export type AddToCartDto = z.infer<typeof addToCartSchema>;
