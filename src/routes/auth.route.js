import { Router } from "express"
import {
  registerAdmin,
  registerTeacher,
  registerStudent,
  loginAdmin,
  loginTeacher,
  loginStudent,
  logout,
  refreshAuthTokens,
  changePassword,
  verifySession,
  registerParent,
  loginParent
} from '../controllers/auth.controller.js';
import { upload } from "../middlewares/multer.middleware.js";
import { createRoleBasedJWTMiddleware } from "../middlewares/createRoleBasedJWTMiddleware.js";
import { checkRole } from "../middlewares/checkrole.middleware.js";

const router = Router();

// Register routes
router.post('/register-admin',
  upload.single('logo'),
  registerAdmin);

router.post('/register-teacher',
  createRoleBasedJWTMiddleware(),
  checkRole('admin'),
  upload.single('logo'),
  registerTeacher);

router.post('/register-parent',
  createRoleBasedJWTMiddleware(),
  checkRole('admin'),
  upload.single('logo'),
  registerParent);

router.post('/register-student',
  createRoleBasedJWTMiddleware(),
  checkRole('admin'),
  upload.single('logo'),
  registerStudent);

// Login routes
router.post('/login-admin', loginAdmin);
router.post('/login-teacher', loginTeacher);
router.post('/login-student', loginStudent);
router.post('/login-parent', loginParent);

// Common auth actions
router.post('/logout', logout);
router.post('/refresh-tokens',
  refreshAuthTokens);
  
router.route("/verify-session").get(
  verifySession);
router.post('/change-password', changePassword);

export default router;
