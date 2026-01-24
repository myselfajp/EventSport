import { SearchQuerySchema } from '../utils/validation.js';
import * as zodValidation from '../utils/validation.js';
import User from '../models/userModel.js';
import { Sport } from '../models/referenceDataModel.js';
import Branch from '../models/branchModel.js';
import { AppError } from '../utils/appError.js';
import Invite from '../models/inviteModel.js';
import Reservation from '../models/reservationModel.js';
import Event from '../models/eventModel.js';
import Participant from '../models/participantModel.js';
import Coach from '../models/coachModel.js';

export const createSearchController = (model, config = {}) => {
    const {
        searchFields = [],
        allowedFilters = [],
        allowedSortFields = [],
        extraFilter = null,
        defaultSort = { createdAt: -1 },
    } = config;

    return async (req, res, next) => {
        try {
            const {
                perPage = 10,
                pageNumber = 1,
                search,
                sortBy,
                sortType = 'asc',
                ...filters
            } = SearchQuerySchema.parse(req.body);

            const skip = (pageNumber - 1) * perPage;
            const filter = {};

            // Text search
            if (search && searchFields.length > 0) {
                filter.$or = searchFields.map((field) => ({
                    [field]: { $regex: search, $options: 'i' },
                }));
            }

            // Apply filters
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    // Only apply if explicitly allowed (when allowedFilters is defined)
                    if (allowedFilters.length > 0 && !allowedFilters.includes(key)) {
                        return; // Skip unauthorized filters
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
                    { path: 'style', select: 'name' },
                    { path: 'salon', select: 'name' },
                    { path: 'facility', select: 'name address phone email photo mainSport membershipLevel private point createdAt' },
                    { path: 'owner', select: 'firstName lastName coach' },
                    { path: 'backupCoach', select: 'firstName lastName coach' },
                ]);
            }
            // Execute query
            const [data, total] = await Promise.all([query, model.countDocuments(filter)]);

            if (data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No results found',
                });
            }

            res.status(200).json({
                success: true,
                data,
                pagination: {
                    currentPage: pageNumber,
                    totalPages: Math.ceil(total / perPage),
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
        const { perPage, pageNumber, sport, search, isVerified } = zodValidation.SearchQuerySchema.parse(req.body);
        const skip = (pageNumber - 1) * perPage;

        let userQuery = { coach: { $ne: null } };
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
        const { perPage, pageNumber, sport, search } = zodValidation.SearchQuerySchema.parse(req.body);
        const skip = (pageNumber - 1) * perPage;

        let query = {};

        // Add name search filter
        if (search && search.trim()) {
            query.name = { $regex: search.trim(), $options: 'i' };
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

export const getEvent = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const user = req.user;
        const data = req.params.eventId;
        const eventId = zodValidation.eventId.parse(data);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        let reservation = null;
        let canReserve = true;

        // Check if user has a reservation for this event
        if (user.participant) {
            reservation = await Reservation.findOne({
                participant: user.participant,
                event: eventId,
            }).select('_id isApproved isWaitListed isCheckedIn isCancelled isPaid');
        }

        if (eventExists.private) {
            if (reservation?.isApproved) {
                return res.status(200).json({
                    success: true,
                    data: eventExists,
                    reservation: reservation,
                });
            }

            const invited = await Invite.findOne({ invitee: user._id, event: eventId });
            if (invited) {
                return res.status(200).json({
                    success: true,
                    canReserve: true,
                    data: eventExists,
                    reservation: reservation,
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
            data: eventExists,
            reservation: reservation,
        });
    } catch (err) {
        next(err);
    }
};
