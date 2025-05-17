import { Router } from "express";
import { adminAi, parentAi, studentAi, teacherAi } from "../controllers/gemini.controller.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
const router = Router();

router.route('/admin-ai').post(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    adminAi
)

router.route('/teacher-ai').post(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    teacherAi
)

router.route('/student-ai').post(
    createRoleBasedJWTMiddleware(),
    checkRole('student'),
    studentAi
)

router.route('/parent-ai').post(
    createRoleBasedJWTMiddleware(),
    checkRole('parent'),
    parentAi
)

export default router