// src/modules/progress/dtos/Grade.dto.ts
import { z } from 'zod';
import { GRADE_ENUM } from '../models/progress.model';


export const GradeDto = z.object({
    grade: z.enum(GRADE_ENUM, {
        errorMap: () => ({ message: 'Grade must be one of: ' + GRADE_ENUM.join(', ') })
    }),
    gpa: z.number()
        .min(0, { message: 'GPA cannot be less than 0.0' })
        .max(4.0, { message: 'GPA cannot exceed 4.0' }),
    progressPercent: z.number()
        .min(0, { message: 'Progress cannot be less than 0%' })
        .max(100, { message: 'Progress cannot exceed 100%' }),
    credits: z.number()
        .min(0, { message: 'Credits cannot be negative' }),
});
export type GradeInput = z.infer<typeof GradeDto>;
