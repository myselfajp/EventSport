import express from 'express';
const router = express.Router();
import { adminMiddleware } from '../middleware/adminMiddleware.js';
import * as notificationController from '../controllers/notificationController.js';

router.get('/', notificationController.getNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:notificationId/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);
router.delete('/:notificationId', notificationController.deleteNotification);

// Admin only routes
router.post('/create', adminMiddleware, notificationController.createNotification);
router.get(
    '/admin/segments',
    adminMiddleware,
    notificationController.listAudienceSegments
);
router.post(
    '/admin/segment-create',
    adminMiddleware,
    notificationController.createSegmentNotification
);

export default router;

