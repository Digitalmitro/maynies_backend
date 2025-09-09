import { Request, Response, Router } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import formsController from "../controllers/form.controller";
import { validate } from "../../../shared/middleware/validation";
import { createFormTemplateSchema } from "../dtos/createFormTemplate.dto";
// import authenticate from "../middleware/authenticate";
// import requireRole from "../middleware/requireRole";
// import * as formsController from "../controllers/forms.controller";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("employer"),
  formsController.getAllForms
);

router.get(
  "/templates",
  authenticate,
  requireRole("employer", "admin"),
  (req: Request, res: Response) => {
    formsController.getFormTemplatesList(req, res);
  }
);

router.get(
  "/submissions",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    formsController.listMySubmissions(req, res);
  }
);

router.get(
  "/submission/:id",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    formsController.getSubmissionById(req, res);
  }
);

router.get(
  "/template/:id",
  authenticate,
  requireRole("employer", "admin"),
  (req: Request, res: Response) => {
    formsController.getFormTemplateById(req, res);
  }
);

// Get a single form definition
// router.get(
//     "/:formId",
//     authenticate,
//     requireRole("employer"),
//     formsController.getFormById
// );

// Submit a new form
router.post(
  "/form-template/:id",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    formsController.createFormSubmission(req, res);
  }
);

router.patch(
  "/form-template/:id",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    formsController.updateFormSubmission(req, res);
  }
);
router.delete(
  "/form-template/:id",
  authenticate,
  requireRole("employer"),
  (req: Request, res: Response) => {
    formsController.deleteSubmissionForm(req, res);
  }
);

router.patch(
  "/form-submission/:id/status",
  authenticate,
  requireRole("admin"),
  (req: Request, res: Response) => {
    formsController.updateFormSubmissionStatus(req, res);
  }
);

// Get all submissions of logged-in employee
// router.get(
//     "/submissions",
//     authenticate,
//     requireRole("employer"),
//     formsController.getMySubmissions
// );

// Get single submission details
// router.get(
//     "/submissions/:submissionId",
//     authenticate,
//     requireRole("employer"),
//     formsController.getSubmissionById
// );

// 📦 Manager/HR Routes

// Get submissions pending for approval
// router.get(
//     "/approvals/pending",
//     authenticate,
//     requireRole("admin"),
//     formsController.getPendingApprovals
// );

// Approve, reject, or request revision for a submission
// router.put(
//     "/approvals/:submissionId",
//     authenticate,
//     requireRole("admin"),
//     formsController.updateApprovalStatus
// );

// 📦 Admin Routes (Future v2)

// Create a new form template

router.post(
  "/template",
  authenticate,
  requireRole("admin"),
  validate(createFormTemplateSchema),
  (req: Request, res: Response) => {
    formsController.createFormTemplate(req, res);
  }
);

router.put(
  "/template/:id",
  authenticate,
  requireRole("admin"),
  (req: Request, res: Response) => {
  formsController.updateFormTemplate(req, res);
  }
);

router.delete(
  "/template/:id",
  authenticate,
  requireRole("admin"),
  (req: Request, res: Response) => {
  formsController.deleteFormTemplate(req, res);
  }
);

router.get(
  "/form-submissions/:templateId",
  authenticate,
  requireRole("admin"),
  (req: Request, res: Response) => {
  formsController.getSubmissionsByTemplate(req, res);
  }
);


// Update a form template
// router.put(
//     "/template/:formId",
//     authenticate,
//     requireRole("admin"),
//     formsController.updateFormTemplate
// );

// Deactivate a form template
// router.delete(
//     "/template/:formId",
//     authenticate,
//     requireRole("admin"),
//     formsController.deactivateFormTemplate
// );

export default router;
