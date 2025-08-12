import { z } from "zod";

export const CreateStudentPlanSchema = z.object({
  // if the caller is an admin they can provide studentId,
  // if caller is a student, studentId should be omitted (we'll use req.user.id)
  studentId: z.string().optional(),
  planId: z.string().min(1, "planId is required"),
  chosenMode: z.enum(["one_time", "installments"]),
});

export type CreateStudentPlanDto = z.infer<typeof CreateStudentPlanSchema>;
