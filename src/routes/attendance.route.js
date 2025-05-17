import { Router } from 'express';
import { getAttendanceHistory, getClassStudents, getStudentAttendanceHistory, hasClassStudents, saveAttendance } from '../controllers/attendance.controllers.js';
import { createRoleBasedJWTMiddleware } from '../middlewares/createRoleBasedJWTMiddleware.js';
import { checkRole } from '../middlewares/checkrole.middleware.js';

const router = Router();

router
    .route('/attendance/has-students/:classId')
    .get(
        createRoleBasedJWTMiddleware(),
        checkRole('teacher'),
        hasClassStudents
    );

router
    .route('/attendance/students/:classId')
    .get(
        createRoleBasedJWTMiddleware(),
        checkRole('teacher'),
        getClassStudents
    );

router
    .route('/attendance')
    .post(
        createRoleBasedJWTMiddleware(),
        checkRole('teacher'),
        saveAttendance
    );

router
    .route('/attendance/history')
    .get(
        createRoleBasedJWTMiddleware(),
        checkRole('teacher'),
        getStudentAttendanceHistory
    );

router
    .route('/attendance/all')
    .get(
        createRoleBasedJWTMiddleware(),
        checkRole('admin'),
        getAttendanceHistory
    );

export default router;