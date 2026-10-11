import express from 'express';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
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
    const timeScope = req.body?.timeScope;
    const isAdmin = req.user?.role === 0 || req.user?.role === '0';

    const filter = {};

    // 1. Status filter
    if (isAdmin) {
        if (status === 'cancelled') {
            filter.status = 'cancelled';
        } else if (status !== 'all') {
            Object.assign(filter, activeEventStatusFilter);
        }
    } else {
        Object.assign(filter, activeEventStatusFilter);
    }

    // 2. Time scope filter (active: endTime >= now, past: endTime < now)
    const now = new Date();
    if (timeScope === 'past') {
        filter.endTime = { $lt: now };
    } else if (timeScope === 'active') {
        filter.endTime = { $gte: now };
    }

    return filter;
};

// club
router.post(
    '/get-club',
    createSearchController(Club, {
        searchFields: ['name'],
        allowedFilters: ['mainSport'],
        populate: [
            { path: 'coaches', select: 'firstName lastName email' },
            { path: 'mainSport', select: 'name' },
        ],
        extraFilter: (req) => {
            const creator = req.body?.creator;
            if (creator && mongoose.Types.ObjectId.isValid(creator)) {
                const cOid = new mongoose.Types.ObjectId(creator);
                return {
                    $or: [{ creator: cOid }, { coaches: cOid }],
                };
            }
            return {};
        },
    })
);
router.post(
    ['/get-group', '/get-group/:clubId'],
    createSearchController(ClubGroup, {
        searchFields: ['name', 'clubName'],
        populate: [
            { path: 'coaches', select: 'firstName lastName email' },
            { path: 'mainSport', select: 'name' },
        ],
        extraFilter: (req) => (req.params.clubId ? { clubId: req.params.clubId } : {}),
    })
);

router.post(
    '/get-group-by-coach',
    createSearchController(ClubGroup, {
        searchFields: ['name', 'clubName'],
        allowedFilters: ['mainSport'],
        populate: [
            { path: 'coaches', select: 'firstName lastName email' },
            { path: 'mainSport', select: 'name' },
        ],
        extraFilter: async (req) => {
            const owner = req.body?.owner;
            const explicitUserId = req.body?.userId;
            if (owner && mongoose.Types.ObjectId.isValid(owner)) {
                const ownerOid = new mongoose.Types.ObjectId(owner);
                const orConditions = [{ owner: ownerOid }, { coaches: ownerOid }];

                if (explicitUserId && mongoose.Types.ObjectId.isValid(explicitUserId)) {
                    orConditions.push({ coaches: new mongoose.Types.ObjectId(explicitUserId) });
                } else {
                    const userDoc = await User.findOne({ coach: ownerOid }).select('_id').lean();
                    if (userDoc?._id) {
                        orConditions.push({ coaches: userDoc._id });
                    }
                }
                return { $or: orConditions };
            }
            return {};
        },
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
