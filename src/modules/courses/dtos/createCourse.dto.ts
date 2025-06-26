import { z } from 'zod';

export const createCourseSchema = z.object({
    title: z.string().min(3),
    slug: z.string().min(3),
    description: z.string().min(10),

    thumbnail_url: z.string().url(),
    instructor_image: z.string().url(),
    preview_video_url: z.string().url().optional(),
    is_free: z.boolean().default(false),
    instructor_name: z.string().min(3),
    category: z.string().min(2),
    language: z.string().min(2),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced']),

    price: z.number().positive(),
    discount_price: z.number().optional(),

    tags: z.array(z.string()).optional(),
    validity_days: z.number().min(1).optional(),

    // ✅ Add this
    materials: z.array(
        z.object({
            title: z.string().min(2),
            file_url: z.string().url(),
            file_type: z.enum(['pdf', 'doc', 'image'])
        })
    ).optional()
});


export type CreateCourseDto = z.infer<typeof createCourseSchema>;