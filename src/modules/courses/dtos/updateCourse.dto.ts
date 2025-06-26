import { z } from 'zod';

export const updateCourseSchema = z.object({
    title: z.string().min(3).optional(),
    slug: z.string().min(3).optional(),
    description: z.string().min(10).optional(),
    thumbnail_url: z.string().url().optional(),
    preview_video_url: z.string().url().optional(),
    instructor_image: z.string().url().optional(),
    instructor_name: z.string().min(3).optional(),

    category: z.string().optional(),
    language: z.string().optional(),
    level: z.enum(['Beginner', 'Intermediate', 'Advanced']).optional(),

    price: z.number().positive().optional(),
    discount_price: z.number().optional(),
    is_free: z.boolean().optional(),

    tags: z.array(z.string()).optional(),
    validity_days: z.number().min(1).optional(),

    materials: z.array(
        z.object({
            title: z.string(),
            file_url: z.string().url(),
            file_type: z.enum(['pdf', 'doc', 'image'])
        })
    ).optional()
});

export type UpdateCourseDto = z.infer<typeof updateCourseSchema>;
