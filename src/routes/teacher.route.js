import { Router } from "express"
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { upload } from "../middlewares/multer.middleware.js";
import teacherDashboardController, { classStudents, deleteTeacherById, getAllTeachers, getTeacherById, getTeacherNumber, resetTeacherNumber, teacherClassDetails, teacherSubjects, updateTeacherById } from "../controllers/teacher.controller.js";

const router = Router();

router.route('/update-teacher/:id').put(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    upload.single('logo'),
    updateTeacherById
)

router.route('/delete-teacher/:id').delete(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    deleteTeacherById
)

router.route('/get-teacher/:teacherId').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getTeacherById);

router.route('/get-all-teachers').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllTeachers
)

router.route('/teacher-subject/:id').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    teacherSubjects
)

router.route('/class-details/:id').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    teacherClassDetails
)

router.route('/students/:id').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    classStudents
)

router.route('/:teacherId/number').get(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    getTeacherNumber
);

router.route('/:teacherId/reset-number').post(
    createRoleBasedJWTMiddleware(),
    checkRole('teacher'),
    resetTeacherNumber
);

router.get(
  '/dashboard/summary',
  createRoleBasedJWTMiddleware(),
  checkRole('teacher'),
  teacherDashboardController.getDashboardSummary
);
export default router;