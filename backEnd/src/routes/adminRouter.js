import express from 'express';
const router = express.Router();
import * as adminController from '../controllers/adminController.js';

router.get('/panel', adminController.getAdminPanel);

// User Management
router.post('/users', adminController.getAllUsers);
router.post('/users/create', adminController.createUser);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);

// Coach Certificate Approval
router.post('/coaches/pending', adminController.getPendingCoaches);
router.put('/coaches/branches/:branchId/approve', adminController.approveCertificate);
router.put('/coaches/branches/:branchId/reject', adminController.rejectCertificate);

export default router;
