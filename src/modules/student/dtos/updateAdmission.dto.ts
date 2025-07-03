import { z } from 'zod';

export const UpdateAdmissionSchema = z.object({
    personal: z
        .object({
            first_name: z.string().min(1, 'First name is required').optional(),
            last_name: z.string().min(1, 'Last name is required').optional(),
            dob: z.preprocess(
                (val) => {
                    if (typeof val === 'string' || val instanceof Date) {
                        const d = new Date(val);
                        return isNaN(d.getTime()) ? undefined : d;
                    }
                },
                z.date({ invalid_type_error: 'Date of birth must be a valid date' }).optional()
            ),
            gender: z.enum(['male', 'female', 'other']).optional(),
            email: z.string().email('Invalid email').optional(),
            mobile: z.string().min(5, 'Mobile must be at least 5 characters').optional(),
            country: z.string().min(1, 'Country is required').optional(),
            marital_status: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
        })
        .optional(),

    address: z
        .object({
            street: z.string().min(1, 'Street is required').optional(),
            city: z.string().min(1, 'City is required').optional(),
            state: z.string().min(1, 'State is required').optional(),
            zip: z.string().min(1, 'ZIP is required').optional(),
        })
        .optional(),

    academic: z
        .object({
            institute: z.string().min(1, 'Institute is required').optional(),
            qualification: z.string().min(1, 'Qualification is required').optional(),
            grade: z.string().min(1, 'Grade is required').optional(),
            passing_year: z
                .number({ invalid_type_error: 'Passing year must be a number' })
                .int('Passing year must be an integer')
                .gte(1900, 'Passing year seems too old')
                .lte(new Date().getFullYear(), 'Passing year cannot be in the future')
                .optional(),
        })
        .optional(),

    parent: z
        .object({
            first_name: z.string().min(1, 'Parent first name is required').optional(),
            last_name: z.string().min(1, 'Parent last name is required').optional(),
            email: z.string().email('Invalid parent email').optional(),
            contact: z.string().optional(),
            address: z
                .object({
                    street: z.string().min(1, 'Parent street is required').optional(),
                    city: z.string().min(1, 'Parent city is required').optional(),
                    state: z.string().min(1, 'Parent state is required').optional(),
                    zip: z.string().min(1, 'Parent ZIP is required').optional(),
                })
                .optional(),
        })
        .optional(),

});

export type UpdateAdmissionDTO = z.infer<typeof UpdateAdmissionSchema>;
