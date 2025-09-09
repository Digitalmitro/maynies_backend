import { Request, Response } from "express";
import FormTemplate from "../models/formTemplates.model";
import formSubmissionModel from "../models/formSubmission.model";
import { Schema } from "mongoose";
import mongoose from "mongoose";
import { UserProfileModel } from "../../user/models/userProfile.model";

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

  async createFormSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data, attachments } = req.body;
  
      // ✅ Check if template exists
      const template = await FormTemplate.findById(id);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }
  
      // ✅ Check for existing pending submission
      const existingSubmission = await formSubmissionModel.findOne({
        employeeId: req?.user?.user?._id,
        formTemplateId: id,
        status: { $in: ["Pending", "In Review"] }, // 👈 yehi block karega
        isDeleted: false, // agar soft delete flag hai toh yeh bhi check karega
      });
  
      if (existingSubmission) {
        return res.status(400).json({
          message:
            "You already have a pending submission for this form. Please wait until it is reviewed.",
        });
      }
  
      // ✅ Validate required fields
      for (const field of template.fields) {
        if (field.type === "file") continue; // 👈 file skip karega
  
        if (field.required && !data[field.name]) {
          return res.status(400).json({
            message: `Field "${field.label}" is required`,
          });
        }
      }
  
      // ✅ Create new submission
      const submission = new formSubmissionModel({
        employeeId: req?.user?.user?._id,
        formTemplateId: id,
        data,
        status: "Pending",
        approvals: [],
        attachments: attachments || [], // array of { url, name }
      });
  
      await submission.save();
  
      return res.status(201).json({
        message: "Form submitted successfully",
        submission,
      });
    } catch (error) {
      console.error("Error creating form submission:", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
  

  // 📝 updateFormSubmission.ts

  async updateFormSubmission(req: Request, res: Response) {
    try {
      const { id } = req.params; // submissionId

      let { data, attachments } = req.body;

      // ✅ Handle FormData stringified JSON
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch (err) {
          console.error("❌ Failed to parse data JSON:", err);
          return res
            .status(400)
            .json({ message: "Invalid JSON in data field" });
        }
      }

      if (typeof attachments === "string") {
        try {
          attachments = JSON.parse(attachments);
        } catch (err) {
          console.error("❌ Failed to parse attachments JSON:", err);
          return res
            .status(400)
            .json({ message: "Invalid JSON in attachments field" });
        }
      }

      console.log("🟢 Parsed data:", data);
      console.log("🟢 Parsed attachments:", attachments);

      // ✅ Find existing submission
      const submission = await formSubmissionModel.findById(id);
      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // ✅ Check ownership
      if (
        submission.employeeId.toString() !== req?.user?.user?._id.toString()
      ) {
        return res
          .status(403)
          .json({ message: "You are not allowed to update this submission" });
      }

      // ✅ Check status (only Draft/Pending can be updated)
      if (["Approved", "Rejected"].includes(submission.status)) {
        return res
          .status(400)
          .json({ message: "Cannot update an already processed submission" });
      }

      // ✅ Validate against template fields
      const template = await FormTemplate.findById(submission.formTemplateId);
      if (!template) {
        return res.status(404).json({ message: "Form template not found" });
      }

      for (const field of template.fields) {
        if (field.type === "file") continue; // skip file inputs
        if (field.required && !data?.[field.name]) {
          return res.status(400).json({
            message: `Field "${field.label}" is required`,
          });
        }
      }

      // ✅ Update fields
      submission.data = data || submission.data;

      if (attachments && Array.isArray(attachments)) {
        // replace old with new
        submission.attachments = attachments.map((att) => ({
          ...att,
          uploadedAt: att.uploadedAt || new Date(),
        }));
      }

      submission.status = "Pending"; // reset to pending if updated
      submission.updatedAt = new Date();

      await submission.save();

      return res.status(200).json({
        success: true,
        message: "Form submission updated successfully",
        submission,
      });
    } catch (error) {
      console.error("❌ Error updating form submission:", error);
      return res.status(500).json({ message: "Internal Server Error" });
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

  async getSubmissionById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const submission = await formSubmissionModel
        .findById(id)
        .populate({
          path: "formTemplateId",
          select: "title fields",
        })
        .populate({
          path: "employeeId",
          select: "name email", // ya jo bhi user fields chahiye
        })
        .lean();

      if (!submission) {
        return res.status(404).json({
          success: false,
          message: "Submission not found",
        });
      }

      res.status(200).json({
        success: true,
        submission,
      });
    } catch (err) {
      console.error("[FormsController.getSubmissionById] Error:", err);
      res.status(500).json({
        success: false,
        message: "Failed to fetch submission",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  // async submissionsDetail(req: Request, res: Response) {
  //   try {
  //     const { id } = req.params;

  //     if (!id) {
  //       return res.status(400).json({ message: "Submission ID is required" });
  //     }

  //     const submission = await formSubmissionModel.findById(id);

  //     if (!submission) {
  //       return res.status(404).json({ message: "Form submission not found" });
  //     }

  //     return res.status(200).json({
  //       message: "Form submission detail fetched successfully",
  //       submission,
  //     });
  //   } catch (error) {
  //     console.error("Error fetching form submission detail:", error);
  //     return res.status(500).json({
  //       message: "Internal Server Error",
  //       error,
  //     });
  //   }
  // }

  async getSubmissionsByTemplate(req: Request, res: Response) {
    try {
      const { templateId } = req.params;
  
      const submissions = await formSubmissionModel
        .find(
          {
            formTemplateId: new mongoose.Types.ObjectId(templateId),
            $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }]
          },
          "_id employeeId status data attachments" // 👈 yahan _id bhi include kar diya
        )
        .sort({ createdAt: -1 })
        .lean();
  
      if (!submissions || submissions.length === 0) {
        return res.status(404).json({ message: "No submissions found for this form" });
      }
  
      const employeeIds = submissions.map(s => s.employeeId);
  
      const profiles = await UserProfileModel.find(
        { user_id: { $in: employeeIds } },
        "first_name last_name user_id"
      ).lean();
  
      const profileMap = profiles.reduce((acc, p) => {
        acc[p.user_id.toString()] = p;
        return acc;
      }, {} as Record<string, any>);
  
      res.status(200).json({
        message: "Submissions fetched successfully",
        submissions: submissions.map((s) => {
          const profile = profileMap[s.employeeId.toString()];
          return {
            id: s._id, // 👈 ab yahan _id bhi jaayega
            employee: {
              id: s.employeeId,
              name: profile ? `${profile.first_name} ${profile.last_name}`.trim() : "N/A",
            },
            fields:s.data,
            attachments: s.attachments,
            status: s.status,
          };
        }),
      });
    } catch (error) {
      console.error("❌ Error fetching submissions:", error);
      res.status(500).json({ message: "Error fetching submissions", error });
    }
  }
  
  

   async  updateFormSubmissionStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
  
      // validate
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
  
      // update
      const updatedSubmission = await formSubmissionModel.findByIdAndUpdate(
        id,
        { status },
        { new: true } // return updated document
      )
      if (!updatedSubmission) {
        return res.status(404).json({ message: "Form submission not found" });
      }
  
      return res.status(200).json({
        message: "Status updated successfully",
        // data: updatedSubmission,
      });
    } catch (error) {
      console.error("Error updating form submission status:", error);
      return res.status(500).json({ message: "Internal server error" });
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
          message: "A form template with this title already exists",
        });
      }

      // 2. create new template
      const template = await FormTemplate.create({
        title,
        description,
        fields,
        isActive: isActive ?? true,
        createdBy: req?.user?.user?._id, // 👈 from authenticate middleware
      });

      // 3. return response
      return res.status(201).json({
        success: true,
        message: "Form template created successfully",
        data: template,
      });
    } catch (error) {
      console.error("Create FormTemplate Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getFormTemplatesList(req: Request, res: Response) {
    try {
      const { search, isActive } = req.query;

      const query: any = { isDeleted: false }; // exclude deleted

      if (isActive !== undefined) {
        query.isActive = isActive === "true";
      }

      if (search) {
        query.title = { $regex: search, $options: "i" };
      }

      // fetch only required fields
      const templates = await FormTemplate.find(query)
        .select("title description isActive createdAt updatedAt") // 👈 sirf yeh hi fields aayenge
        .populate("createdBy", "name email")
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        message: "Form templates fetched successfully",
        data: templates,
      });
    } catch (error) {
      console.error("Get FormTemplate List Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async getFormTemplateById(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await FormTemplate.findOne({
        _id: id,
        isDeleted: false,
      }).populate("createdBy", "name email");

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Form template not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Form template fetched successfully",
        data: template,
      });
    } catch (error) {
      console.error("Get FormTemplate ById Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async updateFormTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { title, description, fields, isActive } = req.body;

      // find template
      const template = await FormTemplate.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Form template not found",
        });
      }

      // validations
      if (!title?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Form title is required",
        });
      }

      if (!fields || fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "At least one field is required",
        });
      }

      // update fields
      template.title = title;
      template.description = description;
      template.fields = fields;
      if (typeof isActive === "boolean") {
        template.isActive = isActive;
      }

      await template.save();

      return res.status(200).json({
        success: true,
        message: "Form template updated successfully",
        data: template,
      });
    } catch (error) {
      console.error("Update FormTemplate Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  // Handle Delete FormTemplate
  async deleteFormTemplate(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const template = await FormTemplate.findByIdAndUpdate(
        id,
        { isDeleted: true }, // soft delete
        { new: true }
      );

      if (!template) {
        return res.status(404).json({
          success: false,
          message: "Form template not found",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Form template deleted successfully",
        data: template,
      });
    } catch (error) {
      console.error("Delete FormTemplate Error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  async deleteSubmissionForm(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const submission = await formSubmissionModel.findByIdAndUpdate(
        id,
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
        { new: true }
      );

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      res.status(200).json({
        message: "Submission deleted successfully (soft delete)",
        submission,
      });
    } catch (error) {
      res.status(500).json({ message: "Error deleting submission", error });
    }
  }
}

export default new FormsController();
