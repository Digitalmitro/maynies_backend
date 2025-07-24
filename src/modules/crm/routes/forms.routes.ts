import { Router } from "express";
import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import formsController from "../controllers/form.controller";
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
    requireRole("employer", 'admin'),
    formsController.getFormTemplatesList
);

router.get(
    "/template/:id",
    authenticate,
    requireRole("employer", "admin"),
    formsController.getFormTemplateById
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
    "/submit",
    authenticate,
    requireRole("employer"),
    formsController.submitForm
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
    formsController.createFormTemplate
);

router.put(
    "/template/:id",
    authenticate,
    requireRole("admin"),
    formsController.updateFormTemplate
);

router.delete(
    "/template/:id",
    authenticate,
    requireRole("admin"),
    formsController.deleteFormTemplate
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
