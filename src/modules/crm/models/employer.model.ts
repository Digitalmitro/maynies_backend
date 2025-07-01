// models/employeeProfile.model.ts
import { Schema, model, Document } from "mongoose";
import { formatWithOptions } from "util";

export interface IEmployeeProfile extends Document {
    user_id: Schema.Types.ObjectId;
    designation: string;
    date_of_joining: Date;
    mobile_number: string;
    work_number?: string;
    location: string;
    documents: [
        {
            name: string;
            file_url: string;
            uploaded_at: Date;
            type?: string;
        }
    ]
}





const EmployeeProfileSchema = new Schema<IEmployeeProfile>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },
        designation: { type: String, required: false },
        date_of_joining: { type: Date, required: false },
        mobile_number: { type: String, required: false },
        work_number: { type: String, default: null },
        location: { type: String, required: false },
        documents: [
            {
                name: { type: String, required: false },
                file_url: { type: String, required: false },
                uploaded_at: { type: Date, default: Date.now },
                type: { type: String, default: "pdf" }
            }
        ]
    },
    {
        timestamps: {
            createdAt: "created_at",
            updatedAt: "updated_at"
        }
    }
);

export const EmployeeProfileModel = model<IEmployeeProfile>(
    "EmployeeProfile",
    EmployeeProfileSchema
);
