import mongoose, { Schema, Document } from "mongoose";

export interface FormField {
  id: string; // unique field ID (for frontend rendering)
  name: string;
  label: string;
  type: "text" | "number" | "date" | "file" | "dropdown" | "checkbox" | "textarea" | "radio";
  required: boolean;
  options?: { label: string; value: string }[];
  validations?: Record<string, any>; // flexible
}

export interface FormTemplateDocument extends Document {
  title: string;
  description?: string;
  fields: FormField[];
  createdBy: Schema.Types.ObjectId;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const formFieldSchema = new Schema<FormField>({
  id: { type: String, required: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["text", "number", "date", "file", "dropdown", "checkbox", "textarea", "radio"]
  },
  required: { type: Boolean, default: false },
  options: [{ label: String, value: String }],
  validations: { type: Schema.Types.Mixed }
});

const formTemplateSchema = new Schema<FormTemplateDocument>(
  {
    title: { type: String, required: true },
    description: String,
    fields: { type: [formFieldSchema], required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model<FormTemplateDocument>("FormTemplate", formTemplateSchema);
