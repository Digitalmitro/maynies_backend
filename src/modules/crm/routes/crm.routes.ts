import { Router } from "express";
import employeeRouter from "./employee.routes";
import leaveRouter from "./leave.routes";
import formRouter from "./forms.routes";
import formController from "../controllers/form.controller";


const router = Router();


router.use("/", employeeRouter)
router.use("/leave", leaveRouter)
router.use("/form", formRouter)


export default router;