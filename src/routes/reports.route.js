import { Router } from "express";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { addCommentToReport, getReportComments } from "../controllers/reports.controller.js";

const router = Router();

router.route('/:reportId/comments')
    .post(
        createRoleBasedJWTMiddleware(),
        checkRole('admin', 'parent'),
        addCommentToReport)
    .get(
        createRoleBasedJWTMiddleware(),
        checkRole('admin', 'parent'),
        getReportComments);


export default router