import { Request, Response } from "express";
import FormTemplate from "../models/formTemplates.model";
import formSubmissionModel from "../models/formSubmission.model";

class FormsController {

    async getAllForms(req: Request, res: Response): Promise<void> {
        try {
            const employerId = req?.user?.user?._id;


            // Query parameters
            const { status, search, page = 1, limit = 10 } = req.query;

            const filters: any = {
                employerId,
            };

            // Optional filters
            if (status) {
                filters.status = status; // e.g., 'active', 'draft', 'archived'
            }

            if (search && typeof search === "string") {
                filters.$or = [
                    { title: { $regex: search, $options: "i" } },
                    { description: { $regex: search, $options: "i" } },
                ];
            }

            const currentPage = parseInt(page as string, 10) || 1;
            const perPage = parseInt(limit as string, 10) || 10;

            const totalForms = await formSubmissionModel.countDocuments(filters);

            const forms = await formSubmissionModel.find(filters)
                .sort({ createdAt: -1 }) // recent first
                .skip((currentPage - 1) * perPage)
                .limit(perPage);

            res.status(200).json({
                message: "Forms fetched successfully",
                data: forms,
                meta: {
                    total: totalForms,
                    page: currentPage,
                    limit: perPage,
                    totalPages: Math.ceil(totalForms / perPage),
                },
            });

        } catch (error) {
            console.error("[GET_ALL_FORMS_ERROR]", error);
            res.status(500).json({
                message: "Something went wrong while fetching forms",
                error: error instanceof Error ? error.message : "Unknown error"
                // error: error.message as string || "Unknown error",
            });
        }
    }

    async submitForm(req: Request, res: Response): Promise<void> {
        try {
            const { formTemplateId, data } = req.body;

            // 🛡 Validate: FormTemplate exists and is active
            const formTemplate = await FormTemplate.findById(formTemplateId);
            if (!formTemplate || !formTemplate.isActive) {
                res.status(404).json({
                    success: false,
                    message: "Form not found or inactive"
                });
            }

            // ✅ Save submission
            const newSubmission = await formSubmissionModel.create({
                employeeId: req?.user?.user?._id,     // From authenticate middleware
                formTemplateId,
                data,
                status: "Pending",           // Default status
                approvals: [],               // Start with empty approvals
                attachments: []              // (if any file uploads later)
            });

            // 🎯 Success response
            res.status(201).json({
                success: true,
                message: "Form submitted successfully",
                submissionId: newSubmission._id,
                status: newSubmission.status
            });
        } catch (err) {
            console.error("[FormsController.submitForm] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to submit form",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }

    async createFormTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { title, description, allowedRoles, fields } = req.body;

            // 🛡 Basic validation
            if (!title || !allowedRoles || !Array.isArray(fields)) {
                res.status(400).json({
                    success: false,
                    message: "Title, allowedRoles, and fields are required"
                });
            }

            // 🌱 Replace `select` -> `dropdown`, `textarea` -> `text`
            const sanitizedFields = fields.map((field: { type: string; }) => ({
                ...field,
                type: field.type === "select" ? "dropdown" : field.type === "textarea" ? "text" : field.type
            }));

            // ✅ Create Form Template
            const newForm = await FormTemplate.create({
                title,
                description,
                allowedRoles,
                fields: sanitizedFields,
                createdBy: req?.user?.user?._id, // 🛡 From auth middleware
                isActive: true
            });

            res.status(201).json({
                success: true,
                message: "Form template created successfully",
                formId: newForm._id
            });
        } catch (err) {
            console.error("[FormsController.createFormTemplate] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to create form template",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }

    async getFormTemplatesList(req: Request, res: Response): Promise<void> {
        try {
            const templates = await FormTemplate.find(
                { isActive: true },
                { _id: 1, title: 1, description: 1 } // projection: only these fields
            ).sort({ createdAt: -1 });

            res.status(200).json({
                success: true,
                message: "Form templates list fetched",
                data: templates
            });
        } catch (err) {
            console.error("[getFormTemplatesList] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to fetch form templates list",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }

    async getFormTemplateById(req: Request, res: Response): Promise<void> {
        try {
            const templateId = req.params.id;

            const template = await FormTemplate.findOne({
                _id: templateId,
                isActive: true
            });

            if (!template) {
                res.status(404).json({
                    success: false,
                    message: "Form template not found"
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: "Form template fetched successfully",
                data: template
            });
        } catch (err) {
            console.error("[getFormTemplateById] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to fetch form template",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }

    async updateFormTemplate(req: Request, res: Response): Promise<void> {
        try {
            const templateId = req.params.id;
            const { title, description, allowedRoles, fields, isActive } = req.body;

            // 🛡 Validate required fields
            if (!title || !Array.isArray(fields) || !allowedRoles) {
                res.status(400).json({
                    success: false,
                    message: "Title, allowedRoles, and fields are required"
                });
                return;
            }

            // 🧼 Sanitize field types (same as create)
            const sanitizedFields = fields.map((field: any) => ({
                ...field,
                type: field.type === "select" ? "dropdown" : field.type === "textarea" ? "text" : field.type
            }));

            // 🧾 Build update payload
            const updatedData = {
                title,
                description,
                allowedRoles,
                fields: sanitizedFields,
                ...(typeof isActive === "boolean" && { isActive }), // toggle activation
                updatedAt: new Date()
            };

            // ⚙️ Update the form template
            const updatedTemplate = await FormTemplate.findByIdAndUpdate(
                templateId,
                updatedData,
                { new: true }
            );

            // 🔍 Not Found
            if (!updatedTemplate) {
                res.status(404).json({
                    success: false,
                    message: "Form template not found"
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: "Form template updated successfully",
                data: updatedTemplate
            });

        } catch (err) {
            console.error("[updateFormTemplate] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to update form template",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }

    async deleteFormTemplate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const template = await FormTemplate.findById(id);

            if (!template) {
                res.status(404).json({
                    success: false,
                    message: "Form template not found"
                });
                return;
            }

            if (!template.isActive) {
                res.status(400).json({
                    success: false,
                    message: "Form template is already inactive"
                });
                return;
            }

            template.isActive = false;
            await template.save();

            res.status(200).json({
                success: true,
                message: "Form template deactivated (soft deleted)"
            });
        } catch (err) {
            console.error("[deleteFormTemplate] Error:", err);
            res.status(500).json({
                success: false,
                message: "Failed to delete form template",
                error: err instanceof Error ? err.message : "Unknown error"
            });
        }
    }
}


export default new FormsController();
