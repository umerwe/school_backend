import { Router } from "express"
import { createClass, deleteClass, getAllClasses, updateClass } from "../controllers/class.controller.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";

const router = Router();

router.route('/create-class').post(
    createRoleBasedJWTMiddleware(), // Middleware to verify JWT and attach user info
    checkRole('admin'), // Middleware to check if the user is an admin
    createClass
);

router.route('/update-class/:id').put(
    createRoleBasedJWTMiddleware(), // Middleware to verify JWT and attach user info
    checkRole('admin'), // Middleware to check if the user is an admin
    updateClass
)

router.route('/delete-class/:id').delete(
    createRoleBasedJWTMiddleware(), 
    checkRole('admin'), 
    deleteClass);

router.route('/get-all-classes').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllClasses);



export default router;