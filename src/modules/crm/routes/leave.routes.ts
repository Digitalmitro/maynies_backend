import { NextFunction, Request, Response, Router } from "express";


import { authenticate } from "../../auth/middleware/auth.middleware";
import { requireRole } from "../../../shared/middleware/roleBasedMiddleware";
import { leavePolicySchema } from "../dtos/leavePolicy.dto";
import { validate } from "../../../shared/middleware/validation";
import { leave } from "../controllers/leave.controller";
import { leaveRequestSchema } from "../dtos/leaveRequest.dto";
import { updateLeaveBalanceSchema } from "../dtos/updateLeaveBalance.dto";

const router = Router();

router.post(
    "/",
    authenticate,
    requireRole("admin"), // ✅ Only Admin can access
    validate(leavePolicySchema), // 🛡️ Validate incoming payload
    (req: Request, res: Response) => { leave.createOrUpdateLeavePolicy(req, res) }
);


router.get(
    "/balance",
    authenticate,
    requireRole("employer"),
    (req: Request, res: Response) => { leave.getMyLeaveBalance(req, res) }
);

router.get(
    "/request",
    authenticate,
    requireRole("employer"),
    (req, res) => { leave.getMyLeaveRequests(req, res) }
);

router.post(
    "/request",
    authenticate,
    requireRole("employer"),
    validate(leaveRequestSchema),
    (req: Request, res: Response) => { leave.createLeaveRequest(req, res) }
);

router.get(
    "/admin/request",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => { leave.getAllLeaveRequests(req, res) }
);

router.get(
    "/admin/request/:id",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => { leave.getSingleLeaveRequest(req, res) }
);


router.patch(
    "/admin/request/:id/status",
    authenticate,
    requireRole("admin"),
    (req: Request, res: Response) => { leave.updateLeaveRequestStatus(req, res) }
);




router.get("/:year",
    authenticate,
    requireRole("admin"), // ✅ Only Admin can access
    (req: Request, res: Response) => { leave.getLeavePolicy(req, res) }
);


router.patch(
    "/admin/balance/:userId",
    authenticate,
    requireRole("admin"),
    validate(updateLeaveBalanceSchema),
    (req: Request, res: Response) => { leave.updateLeaveBalance(req, res) }
);





export default router;
