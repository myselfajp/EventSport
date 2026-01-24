import express from 'express';
import { uploadFile } from '../middleware/uploadFileMiddleware.js';
import * as facilityController from '../controllers/facilityController.js';
const router = express.Router();

// facility
router.post(
    '/create-facility',
    uploadFile({ fieldName: 'facility-photo', optional: true }),
    facilityController.createFacility
);
router.put(
    '/:facilityId',
    uploadFile({ fieldName: 'facility-photo', optional: true }),
    facilityController.editFacility
);
router.delete('/:facilityId', facilityController.deleteFacility);

// salon
router.post(
    '/salon/add-salon',
    uploadFile({ fieldName: 'salon-photo', optional: true }),
    facilityController.addSalon
);
router.put(
    '/salon/:salonId',
    uploadFile({ fieldName: 'salon-photo', optional: true }),
    facilityController.editSalon
);
router.delete('/salon/:salonId', facilityController.deleteSalon);

// calendar
router.post('/salon/calendar', facilityController.addAvailableTimeForSalon);
router.put('/salon/calendar/:calendarId', facilityController.editCalendar);
router.delete('/salon/calendar/:calendarId', facilityController.deleteCalendar);

export default router;
