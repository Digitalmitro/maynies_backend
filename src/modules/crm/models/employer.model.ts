import { Schema, model, Document } from "mongoose";
import { DocumentType, EmployeeProfileType } from "../types";



export interface IEmployeeProfile extends Document, EmployeeProfileType { }

const documentSchema = new Schema<DocumentType>({
    name: { type: String },
    file_url: { type: String },
    uploaded_at: { type: Date, default: Date.now },
    type: { type: String, default: "pdf" }
});






const EmployeeProfileSchema = new Schema<IEmployeeProfile>(
    {
        user_id: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        designation: { type: String },
        date_of_joining: { type: Date },
        mobile_number: {
            type: String,
            match: [/^\+?[0-9]{10,15}$/, 'Invalid mobile number']
        },

        work_number: { type: String, default: null },
        location: {
            country: { type: String },
            city: { type: String }
        },
        profile_picture: { type: String },
        documents: [documentSchema]
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
