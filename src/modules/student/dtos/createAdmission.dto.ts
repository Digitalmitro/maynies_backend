// src/modules/student/dtos/createAdmission.dto.ts
import { z } from 'zod';

export const CreateAdmissionSchema = z.object({
    personal: z.object({
        first_name: z.string().min(1, 'First name is required'),
        last_name: z.string().min(1, 'Last name is required'),
        dob: z.preprocess(
            (val) => {
                if (typeof val === 'string' || val instanceof Date) {
                    const d = new Date(val);
                    return isNaN(d.getTime()) ? undefined : d;
                }
            },
            z.date({
                required_error: 'Date of birth is required',
                invalid_type_error: 'Date of birth must be a valid date',
            })
        ),
        gender: z.enum(['male', 'female', 'other']),
        email: z.string().email('Invalid email'),
        mobile: z.string().min(5, 'Mobile must be at least 5 characters'),
        country: z.string().min(1, 'Country is required'),
        marital_status: z.enum(
            ['single', 'married', 'divorced', 'widowed']),
    }),

    address: z.object({
        street: z.string().min(1, 'Street is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State is required'),
        zip: z.string().min(1, 'ZIP is required'),
    }),

    academic: z.object({
        institute: z.string().min(1, 'Institute is required'),
        qualification: z.string().min(1, 'Qualification is required'),
        grade: z.string().min(1, 'Grade is required'),
        passing_year: z
            .number({ invalid_type_error: 'Passing year must be a number' })
            .int('Passing year must be an integer')
            .gte(1900, 'Passing year seems too old')
            .lte(new Date().getFullYear(), 'Passing year cannot be in the future'),
    }),

    parent: z.object({
        first_name: z.string().min(1, 'Parent first name is required'),
        last_name: z.string().min(1, 'Parent last name is required'),
        email: z.string().email('Invalid parent email'),
        contact: z.string().min(5, 'Parent contact must be at least 5 characters'),
        address: z.object({
            street: z.string().min(1, 'Parent street is required'),
            city: z.string().min(1, 'Parent city is required'),
            state: z.string().min(1, 'Parent state is required'),
            zip: z.string().min(1, 'Parent ZIP is required'),
        }),
    }),



});

export type CreateAdmissionDTO = z.infer<typeof CreateAdmissionSchema>;
