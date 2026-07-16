import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import { CERTIFICATE_ALLOWED_MIME_TYPES } from '../utils/multerConfig.js';
import * as coachController from '../controllers/coachController.js';
import * as blogController from '../controllers/blogController.js';
import * as videoController from '../controllers/videoController.js';
const router = express.Router();

// branch
router.post(
    '/create-branch',
    uploadFile({
        mode: 'array',
        fieldName: 'coach-certificate',
        optional: true,
        allowedMimeTypes: CERTIFICATE_ALLOWED_MIME_TYPES,
    }),
    coachController.createBranch
);

router.get('/current-branches/', coachController.currentBranches);

// event
router.post(
    '/create-event',
    uploadFile({
        mode: 'fields',
        fields: [{ name: 'event-photo' }, { name: 'event-banner' }],
    }),
    coachController.createEvent
);

router.post('/invite-candidates', coachController.searchInviteCandidates);

router.post(
    '/edit-event/:eventId',
    uploadFile({
        mode: 'fields',
        fields: [{ name: 'event-photo', optional: true }, { name: 'event-banner', optional: true }],
        optional: true,
    }),
    coachController.editEvent
);
router.post('/cancel-event/:eventId', coachController.cancelEvent);
router.get('/listing-quote', coachController.getListingQuote);
router.delete('/delete-event/:eventId', coachController.deleteEvent);

// blogs
router.get('/blogs', blogController.listCoachBlogs);
router.post(
    '/blogs',
    uploadFile({ fieldName: 'blog-cover-image' }),
    blogController.createCoachBlog
);
router.put(
    '/blogs/:blogId',
    uploadFile({ fieldName: 'blog-cover-image', optional: true }),
    blogController.updateCoachBlog
);
router.delete('/blogs/:blogId', blogController.deleteCoachBlog);

const VIDEO_UPLOAD = {
    mode: 'fields',
    fields: [
        { name: 'video-thumbnail', maxCount: 1 },
        { name: 'video-file', maxCount: 1 },
    ],
    optional: true,
    maxFileSize: 100 * 1024 * 1024,
    allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/webm',
        'video/quicktime',
    ],
    uploadTimeout: 120000,
};

router.get('/videos', videoController.listCoachVideos);
router.post(
    '/videos',
    uploadFile(VIDEO_UPLOAD),
    videoController.createCoachVideo
);
router.put(
    '/videos/:videoId',
    uploadFile(VIDEO_UPLOAD),
    videoController.updateCoachVideo
);
router.delete('/videos/:videoId', videoController.deleteCoachVideo);

router.post('/join-backup-coach/:eventId', coachController.joinBackupCoach);

// clubGroup
router.post(
    '/create-group/:clubId',
    uploadFile({ fieldName: 'group-photo', optional: true }),
    coachController.createGroup
);

router.post(
    '/edit-group/:groupId',
    uploadFile({ fieldName: 'group-photo', optional: true }),
    coachController.editGroup
);

router.delete('/delete-group/:groupId', coachController.deleteGroup);

// club
router.post(
    '/create-club',
    uploadFile({ fieldName: 'club-photo', optional: true }),
    coachController.createClub
);

router.patch(
    '/edit-club/:clubId',
    uploadFile({ fieldName: 'club-photo', optional: true }),
    coachController.editClub
);

router.delete('/delete-club/:clubId', coachController.deleteClub);

// join requests
// router.post('/approve-reservation/:secretId', coachController.approveReservation);
router.post('/approve-join-group', coachController.approveJoinGroup);

router.post('/approve-join-Club', coachController.approveJoinClub);

// invite requests
router.post('/invite-group', coachController.inviteGroup);
router.post('/invite-event', coachController.inviteEvent);

// end photo
router.post(
    '/add-end-photo/',
    uploadFile({ fieldName: 'event-end-photo' }),
    coachController.endPhoto
);

//
router.post('/event/participants/:eventId', coachController.getEventParticipants);
router.post('/my-events', coachController.getMyCreatedEvents);

router.post('/approve-reservation/:requestId', coachController.approveReservation);

router.get('/get-by-detail/:coachId', coachController.getCoachDetails);

router.get('/:coachId/reviews', coachController.getCoachReviews);

// Public follow stats / followers list for a coach profile.
router.get('/:coachId/follow-stats', coachController.getCoachFollowStats);
router.get('/:coachId/followers', coachController.getCoachFollowers);

export default router;
