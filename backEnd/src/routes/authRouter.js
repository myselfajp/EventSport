import express from 'express';
const router = express.Router();
import * as authController from '../controllers/authController.js';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';

router.post('/sign-out', authController.signOut);
router.get('/get-user/:userId', authController.getUser);
router.post('/get-user', authController.getUser);
router.get('/get-current-user', authController.getCurrentUser);
router.post('/edit-user', authController.editUser);
router.post('/edit-user-photo', uploadFile({ fieldName: 'user-photo' }), authController.editUserPhoto);
export default router;
