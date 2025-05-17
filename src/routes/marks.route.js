import { Router } from 'express'
import { AllStudentsMarks, deleteMarks, getAverageMarks, getAverageMarksPerSubject, submitMarks } from "../controllers/marks.controller.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";

const router = Router();

router.route('/submit-marks').post(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    submitMarks);

router.route('/all-students-marks/:teacherId').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    AllStudentsMarks);

router.route('/delete-marks/:marksId').delete(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    deleteMarks);

router.route('/average').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAverageMarks);

router.route('/class/average').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    getAverageMarksPerSubject
);

export default router;