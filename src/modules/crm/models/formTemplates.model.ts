import mongoose, { Schema } from "mongoose";
import { FormField } from "../types";


export interface FormTemplate extends Document {
    title: string;                // Form title
    description?: string;         // Optional description
    allowedRoles: string[];       // Roles allowed to use this form
    allowedDepartments?: string[];// Optional: restrict by dept
    fields: FormField[];          // Array of dynamic fields
    createdBy: string;            // Admin user ID
    isActive: boolean;            // Active/Inactive toggle
    createdAt: Date;
    updatedAt: Date;
}


const formFieldSchema = new Schema<FormField>({
    name: { type: String, required: true },
    label: { type: String, required: true },
    type: {
        type: String,
        required: true,
        enum: ["text", "number", "date", "file", "dropdown", "checkbox", "textarea", "radio"]
    },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    validations: {
        min: Number,
        max: Number,
        maxLength: Number,
        pattern: String
    }
});

const formTemplateSchema = new Schema<FormTemplate>({
    title: { type: String, required: true },
    description: { type: String },
    allowedRoles: [{ type: String, required: true }],
    allowedDepartments: [{ type: String }],
    fields: { type: [formFieldSchema], required: true },
    createdBy: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});


export default mongoose.model<FormTemplate>(
    "FormTemplate",
    formTemplateSchema
);
