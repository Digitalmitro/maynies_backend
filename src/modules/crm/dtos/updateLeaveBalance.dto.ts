import { z } from "zod";

export const updateLeaveBalanceSchema = z.object({

    vacation_balance: z.number().min(0).optional(),
    sick_balance: z.number().min(0).optional(),
    casual_balance: z.number().min(0).optional()

});

export type UpdateLeaveBalanceDto = z.infer<typeof updateLeaveBalanceSchema>;