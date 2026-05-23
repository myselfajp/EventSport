import express from 'express';
const router = express.Router();
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as adminController from '../controllers/adminController.js';
import * as legalController from '../controllers/legalController.js';
import * as contractAcceptanceController from '../controllers/contractAcceptanceController.js';
import * as adminPermissionGroupController from '../controllers/adminPermissionGroupController.js';
import * as blacklistController from '../controllers/blacklistController.js';
import { requireAdminPermission, requireFullAdmin } from '../middleware/requireAdminPermission.js';

router.get('/panel', adminController.getAdminPanel);

// Permission groups (tam yetki)
router.get(
    '/permission-catalog',
    requireFullAdmin,
    adminPermissionGroupController.getPermissionCatalog
);
router.get(
    '/permission-groups',
    requireFullAdmin,
    adminPermissionGroupController.listPermissionGroups
);
router.post(
    '/permission-groups',
    requireFullAdmin,
    adminPermissionGroupController.createPermissionGroup
);
router.put(
    '/permission-groups/:groupId',
    requireFullAdmin,
    adminPermissionGroupController.updatePermissionGroup
);
router.delete(
    '/permission-groups/:groupId',
    requireFullAdmin,
    adminPermissionGroupController.deletePermissionGroup
);

// User Management
router.post('/users', requireAdminPermission('admin.users'), adminController.getAllUsers);
router.post('/users/create', requireAdminPermission('admin.users'), adminController.createUser);
router.put('/users/:userId', requireAdminPermission('admin.users'), adminController.updateUser);
router.delete('/users/:userId', requireAdminPermission('admin.users'), adminController.deleteUser);

// Blacklist (admin.blacklist or admin.users)
const blacklistPerm = requireAdminPermission('admin.blacklist', 'admin.users');
router.post('/blacklist', blacklistPerm, blacklistController.listBlacklist);
router.post('/blacklist/create', blacklistPerm, blacklistController.createBlacklistEntry);
router.post('/blacklist/from-user/:userId', blacklistPerm, blacklistController.blacklistUser);
router.delete('/blacklist/:entryId', blacklistPerm, blacklistController.removeBlacklistEntry);

// Coach Certificate Approval
router.post('/coaches/pending', requireAdminPermission('admin.coaches'), adminController.getPendingCoaches);
router.put(
    '/coaches/branches/:branchId/approve',
    requireAdminPermission('admin.coaches'),
    adminController.approveCertificate
);
router.put(
    '/coaches/branches/:branchId/reject',
    requireAdminPermission('admin.coaches'),
    adminController.rejectCertificate
);

// User Profile Details
router.get(
    '/users/:userId/coach-details',
    requireAdminPermission('admin.users'),
    adminController.getCoachDetails
);
router.get(
    '/users/:userId/participant-details',
    requireAdminPermission('admin.users'),
    adminController.getParticipantDetails
);
router.get(
    '/users/:userId/facility-details',
    requireAdminPermission('admin.users'),
    adminController.getFacilityDetails
);
router.get(
    '/users/:userId/club-details',
    requireAdminPermission('admin.users'),
    adminController.getClubDetails
);

// User Profile Edit
router.get(
    '/users/:userId/coach-branches',
    requireAdminPermission('admin.users'),
    adminController.getCoachBranches
);
router.get(
    '/users/:userId/participant-profile',
    requireAdminPermission('admin.users'),
    adminController.getParticipantProfile
);
router.post(
    '/users/:userId/coach-profile',
    requireAdminPermission('admin.users'),
    uploadFile({ mode: 'array', fieldName: 'coach-certificate', optional: true }),
    adminController.updateCoachProfile
);
router.post(
    '/users/:userId/participant-profile',
    requireAdminPermission('admin.users'),
    adminController.updateParticipantProfile
);
router.put(
    '/users/:userId/facility/:facilityId',
    requireAdminPermission('admin.users'),
    uploadFile({ fieldName: 'facility-photo', optional: true }),
    adminController.updateFacilityProfile
);

// Legal (KVKK, Terms & Conditions)
router.get('/legal', requireAdminPermission('admin.legal'), legalController.list);
router.post('/legal', requireAdminPermission('admin.legal'), legalController.create);
router.get('/legal/:documentId', requireAdminPermission('admin.legal'), legalController.getById);
router.put('/legal/:documentId', requireAdminPermission('admin.legal'), legalController.update);
router.put(
    '/legal/:documentId/activate',
    requireAdminPermission('admin.legal'),
    legalController.setActive
);

// Contract acceptances (audit log)
router.get(
    '/contract-acceptances',
    requireAdminPermission('admin.contract_acceptances'),
    contractAcceptanceController.listForAdmin
);
router.get(
    '/users/:userId/contract-acceptances',
    requireAdminPermission('admin.contract_acceptances'),
    contractAcceptanceController.listByUserForAdmin
);

// Static Pages
router.get('/static-pages', requireAdminPermission('admin.static_pages'), adminController.getAllStaticPages);
router.get(
    '/static-pages/active',
    requireAdminPermission('admin.static_pages'),
    adminController.getActiveStaticPages
);
router.get(
    '/static-pages/:pageId',
    requireAdminPermission('admin.static_pages'),
    adminController.getStaticPageById
);
router.post('/static-pages', requireAdminPermission('admin.static_pages'), adminController.createStaticPage);
router.put(
    '/static-pages/:pageId',
    requireAdminPermission('admin.static_pages'),
    adminController.updateStaticPage
);
router.delete(
    '/static-pages/:pageId',
    requireAdminPermission('admin.static_pages'),
    adminController.deleteStaticPage
);

router.get('/suggestions', requireAdminPermission('admin.suggestions'), adminController.listSuggestions);

// Dashboard hero slider (home welcome banner)
router.get(
    '/dashboard-hero-slides',
    requireAdminPermission('admin.dashboard_hero'),
    adminController.listDashboardHeroSlides
);
router.get(
    '/dashboard-hero-analytics',
    requireAdminPermission('admin.dashboard_hero'),
    adminController.getDashboardHeroAnalytics
);
router.post(
    '/dashboard-hero-slides',
    requireAdminPermission('admin.dashboard_hero'),
    uploadFile({ fieldName: 'hero-slide-image', optional: true }),
    adminController.createDashboardHeroSlide
);
router.put(
    '/dashboard-hero-slides/:slideId',
    requireAdminPermission('admin.dashboard_hero'),
    uploadFile({ fieldName: 'hero-slide-image', optional: true }),
    adminController.updateDashboardHeroSlide
);
router.delete(
    '/dashboard-hero-slides/:slideId',
    requireAdminPermission('admin.dashboard_hero'),
    adminController.deleteDashboardHeroSlide
);

export default router;
