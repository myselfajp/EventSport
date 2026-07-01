import express from 'express';
import * as participantController from '../controllers/participantController.js';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
const router = express.Router();

router.post('/create-profile', participantController.createProfile);
router.post('/edit-profile', participantController.editProfile);
router.post('/follow-coach', participantController.followCoach);
router.post('/unfollow-coach', participantController.unfollowCoach);
router.post('/favorite-coach', participantController.favoriteCoach);
router.post('/point-to-coach', participantController.pointToCoach);
router.post('/comment-to-coach', participantController.commentToCoach);
router.post('/follow-facility', participantController.followFacility);
router.post('/unfollow-facility', participantController.unfollowFacility);
router.post('/favorite-facility', participantController.favoriteFacility);
router.post('/point-to-facility', participantController.pointToFacility);
router.post('/favorite-event', participantController.favoriteEvent);

// Unfavorite (frontend sends DELETE /favorite/:type with the entity id in the body).
router.delete('/favorite/:type', (req, res, next) => {
    switch ((req.params.type || '').toLowerCase()) {
        case 'coach':
            return participantController.unfavoriteCoach(req, res, next);
        case 'facility':
            return participantController.unfavoriteFacility(req, res, next);
        case 'event':
            return participantController.unfavoriteEvent(req, res, next);
        default:
            return res
                .status(400)
                .json({ success: false, message: 'Invalid favorite type.' });
    }
});

router.get('/get-favorites', participantController.getFavorites);
router.post('/point-to-event', participantController.pointToEvent);
router.post('/follow-company', participantController.followCompany);
router.post('/unfollow-company', participantController.unfollowCompany);
router.post('/follow-club', participantController.followClub);
router.post('/unfollow-club', participantController.unfollowClub);
router.post('/join-to-group/:groupId', participantController.joinToClubGroup);
router.post('/leave-group/:groupId', participantController.leaveClubGroup);
router.post('/make-reservation', participantController.makeReservation);
router.post('/enroll-series', participantController.enrollInSeries);
router.post('/check-in', participantController.checkIn);
router.post('/confirm-payment', participantController.confirmPayment);
router.post('/follow-group', participantController.followGroup);
router.post('/unfollow-group', participantController.unfollowGroup);
router.post('/join-to-club/:clubId', participantController.joinToClub);
router.post('/leave-club/:clubId', participantController.leaveClub);
router.post(
    '/add-end-photo/',
    uploadFile({ fieldName: 'event-end-photo' }),
    participantController.endPhoto
);
router.post('/event-end-photos', participantController.getEventEndPhotos);
router.get('/get-by-detail/:participantId', participantController.getParticipantDetails);
router.get('/follows', participantController.getFollows);
router.post('/my-reservations', participantController.getMyReservations);

export default router;
