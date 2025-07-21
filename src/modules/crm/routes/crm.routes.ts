import { Router } from "express";
import employeeRouter from "./employee.routes";
import leaveRouter from "./leave.routes";


const router = Router();


router.use("/", employeeRouter)
router.use("/leave", leaveRouter)


export default router;