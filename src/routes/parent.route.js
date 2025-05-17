import { Router } from "express";
import parentDashboardController, {
    deleteParent,
    getAllParents,
    getChildAttendance,
    getChildRecentMarks,
    getChildVouchers,
    getParentById,
    getParentNumber,
    getParentReportCommentsNumber,
    getParentReports,
    resetParentNumber,
    resetParentReportCommentsNumber,
    submitParentReport
} from "../controllers/parent.controller.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";

const router = Router();

router.get("/all",
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllParents);


router.get("/:id", getParentById);

router.delete("/delete/:id",
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    deleteParent);

router.route('/:parentId/number').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getParentNumber
);

router.route('/:parentId/reset-number').post(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    resetParentNumber
);

router.route('/children/attendance').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getChildAttendance
);

router.route('/children/vouchers').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getChildVouchers
);

router.route('/children/marks').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getChildRecentMarks
);

router.route('/submit/reports').post(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    submitParentReport
);

router.route('/get/reports').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getParentReports
);

router.route('/:parentId/report-comments-number').get(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    getParentReportCommentsNumber);

router.route('/:parentId/reset-report-comments-number').post(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    resetParentReportCommentsNumber);

router.get(
    '/dashboard/summary',
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    parentDashboardController.getDashboardSummary
);

export default router;
