import { Router } from 'express';
import { getActivityLog } from '../controllers/activityLog.controller.js';
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";

const router = Router();

router.route('/activity/log').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getActivityLog
)
export default router;