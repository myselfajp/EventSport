import express from 'express';
import {
    createSearchController,
    getCoachList,
    getParticipantList,
    getEvent,
} from '../controllers/getDataController.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import Facility from '../models/facilityModel.js';
import Salon from '../models/salonModel.js';
import Event from '../models/eventModel.js';
import Company from '../models/companyModel.js';
import { EventStyle } from '../models/referenceDataModel.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

// club
router.post(
    '/get-club',
    createSearchController(Club, {
        searchFields: ['name'],
    })
);
router.post(
    '/get-group/:clubId',
    createSearchController(ClubGroup, {
        searchFields: ['clubName'],
        extraFilter: (req) => ({ clubId: req.params.clubId }),
    })
);

router.post(
    '/get-group-by-coach',
    createSearchController(ClubGroup, {
        searchFields: ['name', 'clubName'],
    })
);

// facility
router.post(
    '/get-facility',
    createSearchController(Facility, {
        searchFields: ['name'],
    })
);
router.post(
    '/get-salon/:facilityId',
    createSearchController(Salon, {
        searchFields: ['name'],
        extraFilter: (req) => ({ facility: req.params.facilityId }),
    })
);

// company
router.post(
    '/get-company',
    createSearchController(Company, {
        searchFields: ['name'],
    })
);

// style
router.post(
    '/get-event-style',
    createSearchController(EventStyle, {
        searchFields: ['name'],
    })
);

// event
router.post(
    '/get-event',
    createSearchController(Event, {
        searchFields: ['name'],
        allowedFilters: ['sport', 'sportGroup', 'private'],
        allowedSortFields: ['name', 'sportGroup', 'sport', 'startTime', 'endTime'],
    })
);

router.post('/get-event/:eventId', authMiddleware, getEvent);

router.post('/get-coach-list', getCoachList);
router.post('/get-participant-list', getParticipantList);

export default router;
