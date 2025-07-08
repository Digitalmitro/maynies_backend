// src/modules/profile/dto/update-student-demographic.schema.ts
import { z } from 'zod';

// Zod schema for validating student demographic update payload

export const UpdateStudentDemographicSchema = z.object({
    firstName: z.string().nonempty({ message: 'Full Name is required' }),
    lastName: z.string().nonempty({ message: 'Last Name is required' }),
    birthDate: z.string()
        .nonempty({ message: 'Birthdate is required' })
        .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
    country: z.string().nonempty({ message: 'Country is required' }),
    mothers_name: z.string().optional(),
    gender: z.enum(['Male', 'Female', 'Other']).optional(),
    race: z.string().optional(),
    contact_No: z.string().optional(),
    state: z.string().optional(),
    city: z.string().optional(),
    avatarUrl: z.string().url({ message: 'Invalid URL for avatar' }).optional(),
});



export type UpdateStudentDemographicInput = z.infer<typeof UpdateStudentDemographicSchema>;
