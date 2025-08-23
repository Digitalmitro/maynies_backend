import { Request, Response } from "express";
import FormTemplate from "../models/formTemplates.model";
import formSubmissionModel from "../models/formSubmission.model";
import { Schema } from "mongoose";

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

      const forms = await formSubmissionModel
        .find(filters)
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
        error: error instanceof Error ? error.message : "Unknown error",
        // error: error.message as string || "Unknown error",
      });
    }
  }

  async submitForm(req: Request, res: Response) {
    try {
      const { formTemplateId, data } = req.body;

      // 🛡 Validate: FormTemplate exists and is active
      const formTemplate = await FormTemplate.findById(formTemplateId);
      if (!formTemplate || !formTemplate.isActive) {
        res.status(404).json({
          success: false,
          message: "Form not found or inactive",
        });
        return;
      }
      for (const field of formTemplate.fields) {
        const value = data[field.name];

        // Required check
        if (
          field.required &&
          (value === undefined || value === null || value === "")
        ) {
          return res.status(400).json({
            success: false,
            message: `${field.label} is required.`,
          });
        }

        // Skip empty optional fields
        if (
          !field.required &&
          (value === undefined || value === null || value === "")
        ) {
          continue;
        }

        // Type-specific validation
        if (field.type === "number") {
          const num = Number(value);
          if (isNaN(num)) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be a number.`,
            });
          }
          if (
            field.validations?.min !== undefined &&
            num < field.validations.min
          ) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be at least ${field.validations.min}.`,
            });
          }
          if (
            field.validations?.max !== undefined &&
            num > field.validations.max
          ) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be at most ${field.validations.max}.`,
            });
          }
        }

        if (field.type === "text") {
          if (typeof value !== "string") {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be a string.`,
            });
          }
          if (
            field.validations?.maxLength !== undefined &&
            value.length > field.validations.maxLength
          ) {
            return res.status(400).json({
              success: false,
              message: `${field.label} must be under ${field.validations.maxLength} characters.`,
            });
          }
          if (field.validations?.pattern) {
            const regex = new RegExp(field.validations.pattern);
            if (!regex.test(value)) {
              return res.status(400).json({
                success: false,
                message: `${field.label} format is invalid.`,
              });
            }
          }
        }

        // Add more cases here later for dropdown, file, checkbox, etc.
      }
      // ✅ Save submission
      const newSubmission = await formSubmissionModel.create({
        employeeId: req?.user?.user?._id, // From authenticate middleware
        formTemplateId,
        data,
        status: "Pending", // Default status
        approvals: [], // Start with empty approvals
        attachments: [], // (if any file uploads later)
      });

      // 🎯 Success response
      res.status(201).json({
        success: true,
        message: "Form submitted successfully",
        submissionId: newSubmission._id,
        status: newSubmission.status,
      });
    } catch (err) {
      console.error("[FormsController.submitForm] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to submit form",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async updateFormSubmission(req: Request, res: Response) {
    try {
      const employeeId = req?.user?.user?._id;
      const submissionId = req.params.id;
      const { data } = req.body;

      if (!employeeId || !submissionId) {
        return res.status(400).json({
          success: false,
          message: "Missing employee or submission ID",
        });
      }

      const existingSubmission = await formSubmissionModel.findOne({
        _id: submissionId,
        employeeId,
      });

      if (!existingSubmission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      // ✅ Optional status check
      if (["Approved", "Rejected"].includes(existingSubmission.status)) {
        return res.status(403).json({
          success: false,
          message: "You can't edit a form that is already approved or rejected",
        });
      }

      // 🧠 Get related form template
      const formTemplate = await FormTemplate.findById(
        existingSubmission.formTemplateId
      );
      if (!formTemplate || !formTemplate.isActive) {
        return res.status(404).json({
          success: false,
          message: "Associated form template not found or inactive",
        });
      }

      const updatedData = { ...existingSubmission.data };

      for (const field of formTemplate.fields) {
        const value = data[field.name];

        // ❗ Only update if value is provided
        if (value !== undefined && value !== null) {
          // Optional: Add validation logic again here if needed
          updatedData[field.name] = value;
        }
      }

      existingSubmission.data = updatedData;
      // Optional: status update logic if needed
      // existingSubmission.status = "Pending";
      await existingSubmission.save();

      return res.status(200).json({
        success: true,
        message: "Submission updated successfully",
      });
    } catch (err) {
      console.error("[updateFormSubmission] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update submission",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async listMySubmissions(req: Request, res: Response) {
    try {
      const employeeId = req?.user?.user?._id;

      if (!employeeId) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: employee ID missing",
        });
      }

      const submissions = await formSubmissionModel
        .find({ employeeId })
        .select("_id formTemplateId status")
        .populate({
          path: "formTemplateId",
          select: "title", // Pull only the title
        })
        .sort({ createdAt: -1 })
        .lean();

      const result = submissions.map((sub) => {
        const formTemplate = sub.formTemplateId as unknown as {
          _id: string;
          title: string;
        };
        return {
          _id: sub._id,
          title: formTemplate?.title || "Untitled Form",
          status: sub.status,
        };
      });

      res.status(200).json({
        success: true,
        count: result.length,
        submissions: result,
      });
    } catch (err) {
      console.error("[FormsController.listMySubmissions] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch submissions",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async submissionsDetail(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: "Submission ID is required" });
      }

      const submission = await formSubmissionModel.findById(id);

      if (!submission) {
        return res.status(404).json({ message: "Form submission not found" });
      }

      return res.status(200).json({
        message: "Form submission detail fetched successfully",
        submission,
      });
    } catch (error) {
      console.error("Error fetching form submission detail:", error);
      return res.status(500).json({
        message: "Internal Server Error",
        error,
      });
    }
  }

  async updateSubmissionStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Draft",
      "Pending",
      "Approved",
      "Rejected",
      "NeedsRevision",
    ];

    try {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status provided" });
      }

      const updatedSubmission = await formSubmissionModel.findByIdAndUpdate(
        id,
        { status },
        { new: true }
      );

      if (!updatedSubmission) {
        return res.status(404).json({ message: "Form submission not found" });
      }

      return res.status(200).json({
        message: "Submission status updated successfully",
        data: updatedSubmission,
      });
    } catch (err) {
      console.error("Error updating submission status:", err);
      return res
        .status(500)
        .json({ message: "Server error while updating status" });
    }
  }

  async createFormTemplate(req: Request, res: Response) {
  try {
    const { title, description, fields, isActive } = req.body;

    // 1. check duplicate
    const existing = await FormTemplate.findOne({ title });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A form template with this title already exists"
      });
    }

    // 2. create new template
    const template = await FormTemplate.create({
      title,
      description,
      fields,
      isActive: isActive ?? true,
      createdBy: req?.user?.user?._id // 👈 from authenticate middleware
    });

    // 3. return response
    return res.status(201).json({
      success: true,
      message: "Form template created successfully",
      data: template
    });

  } catch (error) {
    console.error("Create FormTemplate Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
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
        data: templates,
      });
    } catch (err) {
      console.error("[getFormTemplatesList] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch form templates list",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  async getFormTemplateById(req: Request, res: Response): Promise<void> {
    try {
      const templateId = req.params.id;

      const template = await FormTemplate.findOne({
        _id: templateId,
        isActive: true,
      });

      if (!template) {
        res.status(404).json({
          success: false,
          message: "Form template not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Form template fetched successfully",
        data: template,
      });
    } catch (err) {
      console.error("[getFormTemplateById] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch form template",
        error: err instanceof Error ? err.message : "Unknown error",
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
          message: "Title, allowedRoles, and fields are required",
        });
        return;
      }

      // 🧼 Sanitize field types (same as create)
      const sanitizedFields = fields.map((field: any) => ({
        ...field,
        type:
          field.type === "select"
            ? "dropdown"
            : field.type === "textarea"
              ? "text"
              : field.type,
      }));

      // 🧾 Build update payload
      const updatedData = {
        title,
        description,
        allowedRoles,
        fields: sanitizedFields,
        ...(typeof isActive === "boolean" && { isActive }), // toggle activation
        updatedAt: new Date(),
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
          message: "Form template not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Form template updated successfully",
        data: updatedTemplate,
      });
    } catch (err) {
      console.error("[updateFormTemplate] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to update form template",
        error: err instanceof Error ? err.message : "Unknown error",
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
          message: "Form template not found",
        });
        return;
      }

      if (!template.isActive) {
        res.status(400).json({
          success: false,
          message: "Form template is already inactive",
        });
        return;
      }

      template.isActive = false;
      await template.save();

      res.status(200).json({
        success: true,
        message: "Form template deactivated (soft deleted)",
      });
    } catch (err) {
      console.error("[deleteFormTemplate] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to delete form template",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }
}

export default new FormsController();
