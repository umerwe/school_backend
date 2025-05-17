import { Router } from 'express';
import {createAnnouncement,getAllAnnouncements,getAnnouncementsForRole} from '../controllers/announcement.controller.js'
import {createRoleBasedJWTMiddleware} from '../middlewares/createRoleBasedJWTMiddleware.js'
import {checkRole} from '../middlewares/checkrole.middleware.js'
const router = Router();

// Admin sends announcement
router.route('/announcements').post(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    createAnnouncement
);

router.route('/announcements/all').get(
    createRoleBasedJWTMiddleware(),
    checkRole('admin'),
    getAllAnnouncements);

// Get announcements for a specific role (student or teacher)
router.route('/announcements/:role').get(
    createRoleBasedJWTMiddleware(),
    checkRole('student', 'teacher','parent'),
    getAnnouncementsForRole);

export default router;
