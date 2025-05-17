import { Router } from "express"
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";
import { createSubject, deleteSubjectById, getAllSubjects, updateSubjectById } from "../controllers/subject.controller.js";


const router = Router();

router.route('/create-subject').post(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    createSubject
)

router.route("/update-subject/:id").put(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    updateSubjectById);

router.route("/delete-subject/:id").delete(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    deleteSubjectById);

router.route("/get-all-subjects").get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllSubjects
)


export default router;