import { z } from "zod";

export const leaveRequestSchema = z.object({
    type: z.enum(["Vacation", "Sick", "Casual"]),
    start_date: z.string().refine(date => !isNaN(Date.parse(date)), "Invalid start_date"),
    end_date: z.string().refine(date => !isNaN(Date.parse(date)), "Invalid end_date"),
    reason: z.string().min(5, "Reason too short")
});


export type LeaveRequestInput = z.infer<typeof leaveRequestSchema>;