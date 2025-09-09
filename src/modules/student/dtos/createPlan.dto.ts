import { z } from "zod";

// Installment schema
const InstallmentSchema = z.object({
  amount: z
    .number({ invalid_type_error: "Amount must be a number" })
    .positive("Amount must be greater than 0"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid dueDate",
  }),
});

// Create Plan DTO
export const CreatePlanSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  paymentType: z
    .union([z.literal("tuition"), z.literal("hostel"), z.literal("exam"), z.string()]),
    // .min(1, "Payment type required"),
  totalAmount: z.number({ invalid_type_error: "totalAmount must be a number" }).positive(),
  paymentMode: z.enum(["one_time", "installments", "both"]),
  status: z.enum(["active", "inactive"]).default("active"),
  installments: z.array(InstallmentSchema).optional(),
});


export type CreatePlanDTO = z.infer<typeof CreatePlanSchema>;