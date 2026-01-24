import express from 'express';
import * as referenceDataController from '../controllers/referenceDataController.js';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
const router = express.Router();
// sportGoal
router.post('/create-sport-goal/', referenceDataController.createSportGoal);
router.post('/get-sport-goal/', referenceDataController.getSportGoal);
router.put('/update-sport-goal/:sportGoalId', (req, res, next) => {
    console.log('Route matched - update-sport-goal');
    console.log('Route params:', req.params);
    next();
}, referenceDataController.updateSportGoal);
router.delete('/delete-sport-goal/:sportGoalId', referenceDataController.deleteSportGoal);
// sportGroup
router.post('/create-sport-group/', referenceDataController.createSportGroup);
router.post('/get-sport-group/', referenceDataController.getSportGroup);
router.put('/update-sport-group/:sportGroupId', referenceDataController.updateSportGroup);
router.delete('/delete-sport-group/:sportGroupId', referenceDataController.deleteSportGroup);
// sport
router.post('/create-sport/:sportGroupId', uploadFile({ fieldName: 'icon', optional: true }), referenceDataController.createSport);
router.put('/update-sport/:sportId', (req, res, next) => {
    console.log('Route matched - update-sport');
    console.log('Route params:', req.params);
    next();
}, uploadFile({ fieldName: 'icon', optional: true }), referenceDataController.updateSport);
router.post('/get-sport/', referenceDataController.getSport);
router.delete('/delete-sport/:sportId', referenceDataController.deleteSport);
// eventStyle
router.post('/create-event-style/', referenceDataController.createEventStyle);
router.post('/get-event-style/', referenceDataController.getEventStyle);
router.put('/update-event-style/:eventStyleId', referenceDataController.updateEventStyle);
router.delete('/delete-event-style/:eventStyleId', referenceDataController.deleteEventStyle);
export default router;
