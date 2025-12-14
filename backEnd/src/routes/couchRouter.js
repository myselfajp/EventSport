import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as coachController from '../controllers/coachController.js';
const router = express.Router();

// branch
router.post(
    '/create-branch',
    uploadFile({ mode: 'array', fieldName: 'coach-certificate', optional: true }),
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

router.delete('/delete-event/:eventId', coachController.deleteEvent);

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
    '/create-club/',
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

router.post('/approve-reservation/:requestId', coachController.approveReservation);

router.get('/get-by-detail/:coachId', coachController.getCoachDetails);
export default router;
