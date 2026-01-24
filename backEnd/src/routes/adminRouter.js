import express from 'express';
const router = express.Router();
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as legalController from '../controllers/legalController.js';

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

// User Profile Details
router.get('/users/:userId/coach-details', adminController.getCoachDetails);
router.get('/users/:userId/participant-details', adminController.getParticipantDetails);
router.get('/users/:userId/facility-details', adminController.getFacilityDetails);
router.get('/users/:userId/club-details', adminController.getClubDetails);

// User Profile Edit
router.get('/users/:userId/coach-branches', adminController.getCoachBranches);
router.get('/users/:userId/participant-profile', adminController.getParticipantProfile);
router.post(
    '/users/:userId/coach-profile',
    uploadFile({ mode: 'array', fieldName: 'coach-certificate', optional: true }),
    adminController.updateCoachProfile
);
router.post('/users/:userId/participant-profile', adminController.updateParticipantProfile);
router.put(
    '/users/:userId/facility/:facilityId',
    uploadFile({ fieldName: 'facility-photo', optional: true }),
    adminController.updateFacilityProfile
);

// Legal (KVKK, Terms & Conditions)
router.get('/legal', legalController.list);
router.post('/legal', legalController.create);
router.get('/legal/:documentId', legalController.getById);
router.put('/legal/:documentId', legalController.update);
router.put('/legal/:documentId/activate', legalController.setActive);

export default router;
