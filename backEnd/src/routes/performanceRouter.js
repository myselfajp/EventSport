import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import { CERTIFICATE_ALLOWED_MIME_TYPES } from '../utils/multerConfig.js';
import * as performanceController from '../controllers/performanceController.js';

const router = express.Router();

router.get('/current-profile', performanceController.getCurrentProfile);
router.get('/members', performanceController.listApprovedMembers);
router.post(
    '/apply',
    uploadFile({
        fieldName: 'performance-certificate',
        optional: true,
        allowedMimeTypes: CERTIFICATE_ALLOWED_MIME_TYPES,
    }),
    performanceController.createOrUpdateProfile
);

export default router;
