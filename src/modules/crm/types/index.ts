import mongoose, { Schema } from "mongoose";

export interface DocumentType {
    name: string;
    file_url: string;
    uploaded_at: Date;
    type?: string;
}

export interface EmployeeProfileType {
    user_id: Schema.Types.ObjectId;
    designation?: string;
    date_of_joining?: Date;
    mobile_number?: string;
    work_number?: string;
    location?: {
        country?: string;
        city?: string;
    };
    profile_picture?: string;
    documents?: Document[];
}


export interface FormField {
    name: string;                 // Unique field name (camelCase)
    label: string;                // Display label
    type: "text" | "number" | "date" | "file" | "dropdown" | "checkbox";
    required: boolean;
    options?: string[];           // For dropdown/checkbox
    validations?: {
        min?: number;
        max?: number;
        maxLength?: number;
        pattern?: string;           // Regex for text fields
    };
}



export interface ApprovalStep {
    role: string;
    approverId: string;           // ID of manager/HR
    action: "Pending" | "Approved" | "Rejected" | "NeedsRevision";
    date?: Date;
    comment?: string;
}

export interface LoanRequest {
    employeeId: Schema.Types.ObjectId;
    amount: number;
    durationMonths: number;
    reason?: string;
    status: "pending" | "approved" | "rejected";
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
    approvedAt: Date,
    rejectedAt: Date,
}

export interface LoanRepayment {
    loanRequestId: Schema.Types.ObjectId;
    employeeId: Schema.Types.ObjectId;
    month: string; // e.g., "2025-08"
    amount: number;
    status: "unpaid" | "paid";
    paidAt?: Date;
    comment?: string;
    dueDate: Date;
    paidBy?: Schema.Types.ObjectId; // ID of the user who made the payment
    createdAt: Date;
    updatedAt: Date;
}