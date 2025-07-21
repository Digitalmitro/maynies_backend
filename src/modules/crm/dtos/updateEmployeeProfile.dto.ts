import { z } from "zod";

// 🌍 Location schema
const LocationSchema = z.object({
  country: z.string().min(1, "Country is required"),
  city: z.string().min(1, "City is required")
});

// 📄 Document schema
const DocumentSchema = z.object({
  name: z.string().min(1, "Document name is required"),
  file_url: z.string().url("Invalid file URL"),
  uploaded_at: z
    .string()
    .datetime("uploaded_at must be a valid ISO date")
    .optional(),
  type: z.string().default("pdf")
});

// 📦 Combined Profile Schema (UserProfile + EmployeeProfile)
export const updateEmployeeSchema = z.object({
  // 👤 UserProfile Fields
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  avatar_url: z.string().url("Invalid avatar URL").optional(),
  contact_number: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid contact number")
    .optional(),
  bio: z.string().max(300, "Bio too long").optional(),
  gender: z.enum(["Male", "Female", "Other"]).optional(),

  // 🏢 EmployeeProfile Fields
  designation: z.string().optional(),
  date_of_joining: z
    .string()
    .datetime("date_of_joining must be a valid ISO date")
    .optional(),
  mobile_number: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, "Invalid mobile number format")
    .optional(),
  work_number: z.string().optional(),
  location: LocationSchema.optional(),
  profile_picture: z.string().url("Invalid profile picture URL").optional(),
  documents: z.array(DocumentSchema).optional()
});


export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;