import { Router } from "express";
import employeeRouter from "./employee.routes";
import leaveRouter from "./leave.routes";
import formRouter from "./forms.routes";
import loanRouter from "./loan.routes";
import attendenceRouter from "./attendence.routes";
import payrollRouter from "./payroll.routes";


const router = Router();


router.use("/", employeeRouter)
router.use("/leave", leaveRouter)
router.use("/form", formRouter)
router.use("/loan", loanRouter)
router.use("/attendence", attendenceRouter)
router.use("/payroll", payrollRouter)


export default router;