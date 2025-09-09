import { z } from "zod";

// Field schema for form template
export const formFieldSchema = z.object({
  id:z.string().min(1, "Field ID is required"),
  name: z.string().min(1, "Field name is required"),
  label: z.string().min(1, "Label is required"),
  type: z.enum([
    "text",
    "number",
    "date",
    "file",
    "dropdown",
    "checkbox",
    "textarea",
    "radio"
  ]),
  required: z.boolean().optional().default(false),
  options: z.array(z.object({
    label: z.string(),
    value: z.string()
  })).optional(), // only for dropdown/radio
  validations: z.object({
    min: z.number().optional(),
    max: z.number().optional(),
    maxLength: z.number().optional(),
    pattern: z.string().optional()
  }).optional()
});

// Main DTO for FormTemplate creation
export const createFormTemplateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().optional(),
  fields: z.array(formFieldSchema).nonempty("At least one field is required"),
  isActive: z.boolean().optional()
});

export type CreateFormTemplateDto = z.infer<typeof createFormTemplateSchema>;
