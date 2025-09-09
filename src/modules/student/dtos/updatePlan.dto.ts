import { z } from "zod";

export const updatePlanSchema =z.object( {
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  paymentType: z.enum(["tuition", "exam", "hostel", "custom"]).optional(),
  customPaymentType: z.string().optional(),
  totalAmount: z.number().min(0).optional(),
  paymentMode: z.enum(["one_time", "installments"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  installments: z
    .array(
      z.object({
        amount: z.number().min(1),
        dueDate: z.string(), // ISO date string
      })
    )
    .optional(),
});

export type UpdatePlanDTO = z.infer<typeof updatePlanSchema>;