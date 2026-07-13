import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as performanceController from '../controllers/performanceController.js';

const router = express.Router();

router.get('/current-profile', performanceController.getCurrentProfile);
router.get('/members', performanceController.listApprovedMembers);
router.post(
    '/apply',
    uploadFile({ fieldName: 'performance-certificate', optional: true }),
    performanceController.createOrUpdateProfile
);

export default router;
