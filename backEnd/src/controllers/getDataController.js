import mongoose from 'mongoose';
import { SearchQuerySchema } from '../utils/validation.js';
import * as zodValidation from '../utils/validation.js';
import User from '../models/userModel.js';
import { Sport } from '../models/referenceDataModel.js';
import Branch from '../models/branchModel.js';
import { AppError } from '../utils/appError.js';
import Invite from '../models/inviteModel.js';
import Reservation from '../models/reservationModel.js';
import EventEndPhoto from '../models/eventEndPhotoModel.js';
import Event from '../models/eventModel.js';
import Participant from '../models/participantModel.js';
import Coach from '../models/coachModel.js';
import { loadMappedEventEndPhotos } from '../utils/eventEndPhotoHelper.js';
import { resolveCheckInOpensHours, attachCheckInMeta } from '../utils/eventCheckInHelper.js';
import { applyLocationFilter } from '../utils/locationHelper.js';
import EventSeries from '../models/eventSeriesModel.js';
import SeriesEnrollment from '../models/seriesEnrollmentModel.js';

export const createSearchController = (model, config = {}) => {
    const {
        searchFields = [],
        allowedFilters = [],
        allowedSortFields = [],
        extraFilter = null,
        defaultSort = { createdAt: -1 },
        districtFilterField = 'location.district',
    } = config;

    return async (req, res, next) => {
        try {
            const parsed = SearchQuerySchema.parse(req.body);
            const {
                perPage = 10,
                pageNumber = 1,
                search,
                sortBy,
                sortType = 'asc',
                district,
                ...filters
            } = parsed;

            const skip = (pageNumber - 1) * perPage;
            const filter = {};
            applyLocationFilter(filter, { district }, districtFilterField);

            const trimmedSearch = typeof search === 'string' ? search.trim() : '';
            const orParts = [];

            // Text search on configured fields
            if (trimmedSearch && searchFields.length > 0) {
                orParts.push(
                    ...searchFields.map((field) => ({
                        [field]: { $regex: trimmedSearch, $options: 'i' },
                    }))
                );
            }

            // Exact MongoDB ObjectId match (event / facility / club etc.)
            if (
                trimmedSearch &&
                /^[a-fA-F0-9]{24}$/.test(trimmedSearch) &&
                mongoose.Types.ObjectId.isValid(trimmedSearch)
            ) {
                orParts.push({ _id: new mongoose.Types.ObjectId(trimmedSearch) });
            }

            if (orParts.length > 0) {
                filter.$or = orParts;
            }

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (key === 'district') {
                        return;
                    }
                    // Only apply if explicitly allowed (when allowedFilters is defined)
                    if (allowedFilters.length > 0 && !allowedFilters.includes(key)) {
                        return; // Skip unauthorized filters
                    }
                    if (
                        (key === 'mainSport' || key === 'sport') &&
                        mongoose.Types.ObjectId.isValid(value)
                    ) {
                        filter[key] = new mongoose.Types.ObjectId(value);
                        return;
                    }
                    filter[key] = value;
                }
            });

            // Extra filter from route params
            if (extraFilter) {
                Object.assign(filter, extraFilter(req));
            }

            // Build sort
            const sort = {};
            if (sortBy && (allowedSortFields.length === 0 || allowedSortFields.includes(sortBy))) {
                sort[sortBy] = sortType === 'desc' ? -1 : 1;
            } else {
                Object.assign(sort, defaultSort);
            }

            // Check if route contains /get-event/ to determine population
            const shouldPopulate =
                req.route?.path === '/get-event' || req.route?.path === '/get-event/:eventId';

            // Build query with conditional population
            let query = model.find(filter).sort(sort).skip(skip).limit(perPage);

            if (shouldPopulate) {
                query = query.populate([
                    { path: 'club', select: 'name' },
                    { path: 'group', select: 'name' },
                    { path: 'sport', select: 'name' },
                    { path: 'sportGroup', select: 'name' },
                    { path: 'style', select: 'name color checkInOpensHoursBeforeStart' },
                    { path: 'salon', select: 'name' },
                    { path: 'facility', select: 'name address phone email photo mainSport membershipLevel private point createdAt location' },
                    { path: 'district', select: 'name' },
                    { path: 'owner', select: 'firstName lastName coach' },
                    { path: 'backupCoach', select: 'firstName lastName coach' },
                    {
                        path: 'series',
                        select: 'name frequency interval sessionCount priceType participationFeePerSession status',
                    },
                ]);
            }
            // Execute query
            const [data, total] = await Promise.all([query, model.countDocuments(filter)]);

            res.status(200).json({
                success: true,
                data,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: Math.max(1, Math.ceil(total / perPage) || 1),
                    perPage,
                    total,
                },
            });
        } catch (err) {
            next(err);
        }
    };
};

export const getCoachList = async (req, res, next) => {
    try {
        const {
            perPage,
            pageNumber,
            sport,
            search,
            isVerified,
            district,
        } = zodValidation.SearchQuerySchema.parse(req.body);
        const skip = (pageNumber - 1) * perPage;

        let userQuery = { coach: { $ne: null } };
        applyLocationFilter(userQuery, { district });
        let coachQuery = {};
        let branchByCoach = null;

        // Build coach query filters
        if (search && search.trim()) {
            coachQuery.name = { $regex: search.trim(), $options: 'i' };
        }

        if (typeof isVerified === 'boolean') {
            coachQuery.isVerified = isVerified;
        }

        // Get coaches matching the filters
        let coachIds = [];
        if (Object.keys(coachQuery).length > 0 || sport) {
            if (sport) {
                const sportExists = await Sport.findById(sport);
                if (!sportExists) throw new AppError(404, 'Sport not found');

                // Get all branches for the sport
                const branches = await Branch.find({ sport }).select('level coach').lean();
                const sportCoachIds = branches.map((branch) => branch.coach);

                // Create a map for quick branch lookup by coach ID
                branchByCoach = new Map(
                    branches.map((branch) => [
                        branch.coach.toString(),
                        { level: branch.level, branchId: branch._id },
                    ])
                );

                // If we have sport filter, add it to coach query
                coachQuery._id = { $in: sportCoachIds };
            }

            // Find coaches matching all criteria
            const coaches = await Coach.find(coachQuery).select('_id').lean();
            coachIds = coaches.map(coach => coach._id);

            if (coachIds.length === 0) {
                return res.status(200).json({
                    success: true,
                    data: [],
                    pagination: {
                        page: pageNumber,
                        perPage,
                        total: 0,
                        totalPages: 0,
                    },
                });
            }

            userQuery.coach = { $in: coachIds };
        }

        const totalCoaches = await User.countDocuments(userQuery);

        const users = await User.find(userQuery)
            .select('-email -phone -isEmailVerified -isPhoneVerified')
            .populate('coach', 'name membershipLevel point isVerified')
            .skip(skip)
            .limit(perPage)
            .lean();

        // Enrich users with branch data if sport was provided
        const enrichedUsers = branchByCoach
            ? users.map((user) => {
                const coachId = user.coach?._id?.toString();
                const branchData = coachId ? branchByCoach.get(coachId) : null;
                return {
                    ...user,
                    branchLevel: branchData?.level,
                    branchId: branchData?.branchId,
                };
            })
            : users;

        res.status(200).json({
            success: true,
            data: enrichedUsers,
            pagination: {
                page: pageNumber,
                perPage,
                total: totalCoaches,
                totalPages: Math.ceil(totalCoaches / perPage),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getParticipantList = async (req, res, next) => {
    try {
        const {
            perPage,
            pageNumber,
            sport,
            search,
            district,
        } = zodValidation.SearchQuerySchema.parse(req.body);
        const skip = (pageNumber - 1) * perPage;

        let query = {};
        applyLocationFilter(query, { district });

        const trimmed = search?.trim() || '';
        if (trimmed) {
            if (
                /^[a-fA-F0-9]{24}$/.test(trimmed) &&
                mongoose.Types.ObjectId.isValid(trimmed)
            ) {
                query._id = new mongoose.Types.ObjectId(trimmed);
            } else {
                query.name = { $regex: trimmed, $options: 'i' };
            }
        }

        if (sport) {
            const sportExists = await Sport.findById(sport);
            if (!sportExists) throw new AppError(404, 'Sport not found');
            query.mainSport = sport;
        }

        const totalParticipants = await Participant.countDocuments(query);

        const participants = await Participant.find(query)
            .select('name mainSport skillLevel sportGoal membershipLevel point')
            .populate({
                path: 'mainSport',
                select: 'name',
            })
            .populate({
                path: 'sportGoal',
                select: 'name',
            })
            .skip(skip)
            .limit(perPage)
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: participants,
            pagination: {
                page: pageNumber,
                perPage,
                total: totalParticipants,
                totalPages: Math.ceil(totalParticipants / perPage),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getEventEndPhotosPublic = async (req, res, next) => {
    try {
        const eventId = zodValidation.eventId.parse(req.params.eventId);

        const eventDoc = await Event.findById(eventId).select('endTime private owner backupCoach').lean();
        if (!eventDoc) throw new AppError(404, 'Event not found');

        const endedAt = eventDoc.endTime ? new Date(eventDoc.endTime) : null;
        const ended = !!(endedAt && Date.now() >= endedAt.getTime());
        const hasAny = await EventEndPhoto.exists({ event: eventId });
        if (!ended && !hasAny) {
            return res.status(200).json({ success: true, data: [] });
        }

        if (eventDoc.private) {
            const user = req.user;
            const allowed = await userMayViewPrivateEventEndPhotos(eventDoc, user, eventId);
            if (!allowed) {
                throw new AppError(!user ? 401 : 403, !user ? 'Sign in to view photos' : 'Access denied');
            }
        }

        const data = await loadMappedEventEndPhotos(eventId);
        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

async function userMayViewPrivateEventEndPhotos(eventLean, user, eventId) {
    if (!user) return false;
    if (user.role === 0) return true;
    if (eventLean.owner.equals(user._id)) return true;
    if (eventLean.backupCoach && eventLean.backupCoach.equals(user._id)) return true;
    if (user.participant) {
        const resv = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        })
            .select('isApproved')
            .lean();
        if (resv?.isApproved) return true;
    }
    return !!(await Invite.exists({ invitee: user._id, event: eventId }));
}

export const getEvent = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const user = req.user;
        const data = req.params.eventId;
        const eventId = zodValidation.eventId.parse(data);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        let reservation = null;

        // Check if user has a reservation for this event
        if (user.participant) {
            reservation = await Reservation.findOne({
                participant: user.participant,
                event: eventId,
            })
                .select('_id isApproved isWaitListed isCheckedIn isCancelled isPaid qr')
                .lean();
        }

        let hasEndPhotoSubmission = false;
        if (user.participant && reservation) {
            hasEndPhotoSubmission = !!(await EventEndPhoto.exists({
                user: user._id,
                event: eventId,
            }));
        }

        let hasCoachEndPhotoSubmission = false;
        if (user.coach) {
            hasCoachEndPhotoSubmission = !!(await EventEndPhoto.exists({
                coach: user.coach,
                event: eventId,
            }));
        } else if (user.role === 0) {
            hasCoachEndPhotoSubmission = !!(await EventEndPhoto.exists({
                event: eventId,
                user: user._id,
            }));
        }

        const reservationExtras = { hasEndPhotoSubmission, hasCoachEndPhotoSubmission };
        const checkInHours = await resolveCheckInOpensHours(eventExists);
        const eventPayload = attachCheckInMeta(eventExists, checkInHours);

        let seriesInfo = null;
        let seriesSessions = null;
        let seriesEnrollment = null;

        if (eventExists.series) {
            seriesInfo = await EventSeries.findById(eventExists.series)
                .select(
                    'name frequency interval sessionCount priceType participationFeePerSession status'
                )
                .lean();
            seriesSessions = await Event.find({ series: eventExists.series })
                .sort({ sessionIndex: 1 })
                .select('_id name sessionIndex startTime endTime status')
                .lean();

            if (user.participant) {
                seriesEnrollment = await SeriesEnrollment.findOne({
                    participant: user.participant,
                    series: eventExists.series,
                    status: 'active',
                })
                    .select('_id sessionCount totalFee isPaid status')
                    .lean();
            }
        }

        const seriesExtras = { series: seriesInfo, seriesSessions, seriesEnrollment };

        if (eventExists.private) {
            const isStaff =
                user.role === 0 ||
                eventExists.owner.equals(user._id) ||
                (eventExists.backupCoach && eventExists.backupCoach.equals(user._id));
            if (isStaff) {
                return res.status(200).json({
                    success: true,
                    data: eventPayload,
                    reservation,
                    ...reservationExtras,
                    ...seriesExtras,
                });
            }

            if (reservation?.isApproved) {
                return res.status(200).json({
                    success: true,
                    data: eventPayload,
                    reservation,
                    ...reservationExtras,
                    ...seriesExtras,
                });
            }

            const invited = await Invite.findOne({ invitee: user._id, event: eventId });
            if (invited) {
                return res.status(200).json({
                    success: true,
                    canReserve: true,
                    data: eventPayload,
                    reservation,
                    ...reservationExtras,
                    ...seriesExtras,
                });
            }
            return res.status(403).json({
                success: false,
                canReserve: false,
                message: 'Access denied to this private event',
            });
        }

        res.status(200).json({
            success: true,
            data: eventPayload,
            reservation,
            ...reservationExtras,
            ...seriesExtras,
        });
    } catch (err) {
        next(err);
    }
};

export const getEventSeries = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const seriesId = zodValidation.mongoObjectId.parse(req.params.seriesId);
        const series = await EventSeries.findById(seriesId)
            .select(
                'name frequency interval sessionCount priceType participationFeePerSession status owner'
            )
            .lean();
        if (!series || series.status === 'cancelled') {
            throw new AppError(404, 'Event series not found');
        }

        const sessions = await Event.find({ series: seriesId })
            .sort({ sessionIndex: 1 })
            .select('_id name sessionIndex startTime endTime status capacity')
            .lean();

        let seriesEnrollment = null;
        if (req.user.participant) {
            seriesEnrollment = await SeriesEnrollment.findOne({
                participant: req.user.participant,
                series: seriesId,
                status: 'active',
            })
                .select('_id sessionCount totalFee isPaid status')
                .lean();
        }

        res.status(200).json({
            success: true,
            data: series,
            sessions,
            seriesEnrollment,
        });
    } catch (err) {
        next(err);
    }
};
