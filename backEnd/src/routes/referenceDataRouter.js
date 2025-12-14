import express from 'express';
import * as referenceDataController from '../controllers/referenceDataController.js';
const router = express.Router();
// sportGoal
router.post('/create-sport-goal/', referenceDataController.createSportGoal);
router.post('/get-sport-goal/', referenceDataController.getSportGoal);
router.delete('/delete-sport-goal/:sportGoalId', referenceDataController.deleteSportGoal);
// sportGroup
router.post('/create-sport-group/', referenceDataController.createSportGroup);
router.post('/get-sport-group/', referenceDataController.getSportGroup);
router.delete('/delete-sport-group/:sportGroupId', referenceDataController.deleteSportGroup);
// sport
router.post('/create-sport/:sportGroupId', referenceDataController.createSport);
router.post('/get-sport/', referenceDataController.getSport);
router.delete('/delete-sport/:sportId', referenceDataController.deleteSport);
// eventStyle
router.post('/create-event-style/', referenceDataController.createEventStyle);
router.post('/get-event-style/', referenceDataController.getEventStyle);
router.delete('/delete-event-style/:eventStyleId', referenceDataController.deleteEventStyle);
export default router;
