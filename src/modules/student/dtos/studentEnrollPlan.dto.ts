import { z } from "zod";

export const CreateStudentPlanSchema = z.object({
  planId: z.string().min(1, "planId is required"),
  chosenMode: z.enum(["one_time", "installments"])
});

export type CreateStudentPlanDto = z.infer<typeof CreateStudentPlanSchema>;
