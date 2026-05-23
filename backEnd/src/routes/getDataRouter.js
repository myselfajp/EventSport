import express from 'express';
import {
    createSearchController,
    getCoachList,
    getParticipantList,
    getEvent,
    getEventEndPhotosPublic,
    getEventSeries,
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

const activeEventStatusFilter = {
    $or: [{ status: 'active' }, { status: { $exists: false } }],
};

const eventListExtraFilter = (req) => {
    const status = req.body?.status;
    const isAdmin = req.user?.role === 0 || req.user?.role === '0';
    if (isAdmin) {
        if (status === 'cancelled') return { status: 'cancelled' };
        if (status === 'all') return {};
        return activeEventStatusFilter;
    }
    return activeEventStatusFilter;
};

// club
router.post(
    '/get-club',
    createSearchController(Club, {
        searchFields: ['name'],
        allowedFilters: ['mainSport'],
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
        allowedFilters: ['mainSport'],
    })
);

// facility
router.post(
    '/get-facility',
    createSearchController(Facility, {
        searchFields: ['name'],
        allowedFilters: ['mainSport'],
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
        searchFields: ['name', 'address'],
        allowedFilters: ['mainSport'],
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
    authMiddleware,
    createSearchController(Event, {
        searchFields: ['name'],
        allowedFilters: ['sport', 'sportGroup', 'private', 'owner', 'facility', 'salon', 'club', 'group'],
        allowedSortFields: ['name', 'sportGroup', 'sport', 'startTime', 'endTime'],
        extraFilter: eventListExtraFilter,
        districtFilterField: 'district',
    })
);

router.post('/get-event/:eventId/end-photos', authMiddleware, getEventEndPhotosPublic);

router.post('/get-event/:eventId', authMiddleware, getEvent);

router.get('/get-event-series/:seriesId', authMiddleware, getEventSeries);

router.post('/get-coach-list', getCoachList);
router.post('/get-participant-list', getParticipantList);

export default router;
