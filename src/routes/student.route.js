import { Router } from "express";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import studentDashboardController, { deleteStudentById, getAllStudents, getStudentAttendance, getStudentById, getStudentMarks, getStudentNumber, getStudentSubjects, resetStudentNumber, updateStudentById } from "../controllers/student.controller.js";


const router = Router();

router.route('/update-student/:id').put(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    upload.single('logo'),
    updateStudentById
);

router.route('/delete-student/:id').delete(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    deleteStudentById
);

router.route('/get-student/:studentId').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getStudentById);

router.route('/get-all-students').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllStudents
);

router.route("/subjects").get(
    createRoleBasedJWTMiddleware(),
    checkRole('student'),
    getStudentSubjects
)

router.route("/:id/marks").get(
    createRoleBasedJWTMiddleware(),
    checkRole('student','parent'),
    getStudentMarks
)

router.route("/:studentId/attendance").get(
    createRoleBasedJWTMiddleware(),
    checkRole('student','parent'),
    getStudentAttendance
)

router.route('/:studentId/number').get(
    createRoleBasedJWTMiddleware(),
    checkRole('student'),
    getStudentNumber
);

router.route('/:studentId/reset-number').post(
    createRoleBasedJWTMiddleware(),
    checkRole('student'),
    resetStudentNumber
);

router.get(
  '/dashboard/summary',
  createRoleBasedJWTMiddleware(),
  checkRole('student'),
  studentDashboardController.getDashboardSummary
);

export default router;