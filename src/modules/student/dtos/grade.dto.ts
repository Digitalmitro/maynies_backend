// src/modules/progress/dto/grade.schema.ts
import { z } from 'zod';

export const GradeDto = z.object({
    score: z.number()
        .min(0, { message: 'Score cannot be negative' }),
    grade: z.string()
        .nonempty({ message: 'Grade is required' }),
});

export type GradeInput = z.infer<typeof GradeDto>;
