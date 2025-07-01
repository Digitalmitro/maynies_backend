// src/modules/student/dto/admission.schema.ts
import { z } from 'zod';

export const AdmissionApplySchema = z.object({
    personal: z.object({
        first_name: z.string().min(1),
        last_name: z.string().min(1),
        dob: z.preprocess(
            (val) => {
                if (typeof val === 'string' || val instanceof Date) {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? undefined : d;
                }
            },
            z
                .date({ required_error: 'DOB is required', invalid_type_error: 'DOB must be a valid date' })
        ),
        gender: z.enum(['male', 'female', 'other']),
        email: z.string().email(),
        mobile: z.string().min(5),
    }),
    address: z.object({
        street: z.string().min(1),
        city: z.string().min(1),
        state: z.string().min(1),
        zip: z.string().min(1),
    }),
    academic: z.object({
        institute: z.string().min(1),
        qualification: z.string().min(1),
        grade: z.string().min(1),
        passing_year: z
            .number({ invalid_type_error: 'Passing year must be a number' })
            .int()
            .gte(1900)
            .lte(new Date().getFullYear()),
    }),
    guardian: z.object({
        name: z.string().min(1),
        contact: z.string().min(5),
        relation: z.string().min(1),
    }),
    documents: z
        .array(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid File ID'))
        .nonempty({ message: 'At least one document is required' }),
});

export type AdmissionApplyDto = z.infer<typeof AdmissionApplySchema>;
