import { Router } from "express"
import {getAdminNumber, getAdminReports, resetAdminNumber, updateAdminById } from "../controllers/admin.controller.js";
import adminDashboardController from "../controllers/admin.controller.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router()

router.route('/update-admin/:id').put(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    upload.single('logo'),
    updateAdminById
)

router.route('/reports').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAdminReports
)

router.route('/number').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAdminNumber
);

router.route('/reset-number').post(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    resetAdminNumber
);

router.get(
  '/dashboard/summary',
  createRoleBasedJWTMiddleware(),
  checkRole('admin'),
  adminDashboardController.getDashboardSummary
);


export default router;