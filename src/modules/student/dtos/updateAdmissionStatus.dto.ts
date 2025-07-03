import { z } from 'zod';

export const UpdateAdmissionStatusSchema = z.object({
    status: z.enum(['pending', 'approved', 'rejected'], {
        required_error: 'Status is required',
        invalid_type_error: 'Invalid status value'
    })
});

export type UpdateAdmissionStatusDTO = z.infer<typeof UpdateAdmissionStatusSchema>;