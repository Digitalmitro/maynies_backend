import { Router } from "express";
import employeeRouter from "./employee.routes";
import leaveRouter from "./leave.routes";
import formRouter from "./forms.routes";
import loanRouter from "./loan.routes";
import attendenceRouter from "./attendence.routes";
import formController from "../controllers/form.controller";


const router = Router();


router.use("/", employeeRouter)
router.use("/leave", leaveRouter)
router.use("/form", formRouter)
router.use("/loan", loanRouter)
router.use("/attendence", attendenceRouter)


export default router;