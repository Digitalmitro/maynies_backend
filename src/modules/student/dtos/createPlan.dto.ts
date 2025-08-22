import { z } from "zod";

const installmentSchema = z.object({
  amount: z.number().positive(),
  dueDate: z.string().transform((val) => new Date(val)), // convert string -> Date
});

export const CreatePlanSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  paymentType: z.enum(["tuition", "hostel", "exam"]).or(z.string()), // allow custom types also
  totalAmount: z.number().positive(),

  paymentMode: z.enum(["one_time", "installments", "both"]),

  oneTimePaymentAmount: z.number().positive().nullable().optional(),

  installmentCount: z.number().int().nonnegative().optional(),
  installmentAmounts: z.array(installmentSchema).optional(),

  lateFeeType: z.enum(["fixed", "percentage"]).optional(),
  lateFeeValue: z.number().positive().optional(),

  startDate: z.string().transform((val) => new Date(val)).optional(),
  endDate: z.string().transform((val) => new Date(val)).optional(),

  status: z.enum(["active", "inactive"]).default("active"),
}).refine((data) => {
  if (data.paymentMode === "one_time") {
    return !!data.oneTimePaymentAmount && data.oneTimePaymentAmount > 0;
  }
  return true;
}, { message: "oneTimePaymentAmount is required for one_time mode" })
.refine((data) => {
  if (data.paymentMode === "installments") {
    return !!data.installmentCount && data.installmentCount > 0 && !!data.installmentAmounts?.length;
  }
  return true;
}, { message: "installmentCount and installmentAmounts required for installments mode" })
.refine((data) => {
  if (data.paymentMode === "both") {
    return !!data.oneTimePaymentAmount && data.oneTimePaymentAmount > 0
      && !!data.installmentCount && data.installmentCount > 0
      && !!data.installmentAmounts?.length;
  }
  return true;
}, { message: "For both mode, oneTimePaymentAmount + installments required" });


export type CreatePlanDto = z.infer<typeof CreatePlanSchema>;