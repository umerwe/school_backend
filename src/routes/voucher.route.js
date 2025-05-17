import { Router } from "express"
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { generateVoucher, getAllVouchers, getStudentVouchers } from "../controllers/voucher.controller.js";

const router = Router();

router.route('/generate-voucher').post(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    generateVoucher
)

router.route('/student/:studentId').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent','student'),
    getStudentVouchers
)

router.route('/all').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllVouchers
)

export default router;