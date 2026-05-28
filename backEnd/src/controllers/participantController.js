import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import Participant from '../models/participantModel.js';
import Follow from '../models/followModel.js';
import FavoriteList from '../models/favoriteListModel.js';
import Reservation from '../models/reservationModel.js';
import Coach from '../models/coachModel.js';
import Facility from '../models/facilityModel.js';
import Point from '../models/pointModel.js';
import Company from '../models/companyModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import { JoinClub, JoinGroup } from '../models/joinRequestModel.js';
import Event from '../models/eventModel.js';
import Invite from '../models/inviteModel.js';
import EventEndPhoto from '../models/eventEndPhotoModel.js';
import RegistrationConsentLog from '../models/registrationConsentLogModel.js';
import { recordLegalAcceptance } from '../utils/contractAcceptanceHelper.js';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import * as zodValidation from '../utils/validation.js';
import { loadMappedEventEndPhotos } from '../utils/eventEndPhotoHelper.js';
import {
    resolveCheckInOpensHours,
    checkInOpensAt,
    isWithinCheckInWindow,
} from '../utils/eventCheckInHelper.js';
import { enrollParticipantInSeries } from '../utils/eventSeriesService.js';

export const createProfile = async (req, res, next) => {
    try {
        if (!req.user || req.user.participant) {
            throw new AppError(!req.user ? 401 : 409);
        }

        const user = req.user;
        const result = zodValidation.createParticipantSchema.parse({
            mainSport: req.body?.mainSport,
            skillLevel: req.body?.skillLevel,
            sportGoal: req.body?.sportGoal,
        });

        const participant = await Participant.create({
            ...result,
            name: `${user.firstName} ${user.lastName}`,
        });
        if (!participant) throw new AppError(503);

        const addToUser = await User.findByIdAndUpdate(
            user._id,
            { participant: participant._id },
            { new: true }
        );
        if (!addToUser) throw new AppError(404);
        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const editProfile = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.editParticipantSchema.parse({
            mainSport: req.body?.mainSport,
            skillLevel: req.body?.skillLevel,
            sportGoal: req.body?.sportGoal,
        });

        const editParticipant = await Participant.findByIdAndUpdate(
            user.participant,
            { ...result },
            { new: true }
        );

        if (!editParticipant) throw new AppError(404);
        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const followCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const coachId = zodValidation.coachId.parse(req.body?.coachId);

        // check if coach exists
        const coachExists = await Coach.findById(coachId);
        if (!coachExists) throw new AppError(404);

        // Self-follow guard: a coach should not follow their own coach profile.
        if (user.coach && user.coach.toString() === coachId.toString()) {
            throw new AppError(400, 'You cannot follow your own coach profile.');
        }

        try {
            await Follow.create({
                follower: user._id,
                followingCoach: coachId,
            });
        } catch (err) {
            // Duplicate-key from the unique partial index: already following.
            if (err?.code === 11000) {
                throw new AppError(409, 'You already follow this coach.');
            }
            throw err;
        }

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfollowCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const coachId = zodValidation.coachId.parse(req.body?.coachId);

        // check if coach exists
        const coachExists = await Coach.findById(coachId);
        if (!coachExists) throw new AppError(404);

        // check if follow exists
        const follow = await Follow.findOne({
            follower: user._id,
            followingCoach: coachId,
        });
        if (!follow) throw new AppError(404, 'You do not follow this coach.');

        // remove follow
        await Follow.deleteOne({ _id: follow._id });

        res.status(204).json({
            success: true,
            data: 'unfollowed',
        });
    } catch (err) {
        next(err);
    }
};

export const favoriteCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const coachId = zodValidation.coachId.parse(req.body?.coachId);
        // check if coach exists
        const coachExists = await Coach.findById(coachId);
        if (!coachExists) throw new AppError(404);

        // Self-favorite guard: a coach cannot favorite their own coach profile.
        if (user.coach && user.coach.toString() === coachId.toString()) {
            throw new AppError(400, 'You cannot favorite your own coach profile.');
        }

        try {
            await FavoriteList.create({ user: user._id, coach: coachId });
        } catch (err) {
            if (err?.code === 11000) {
                throw new AppError(409, 'You already added this coach to favorites.');
            }
            throw err;
        }

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfavoriteCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const coachId = zodValidation.coachId.parse(req.body?.coachId);

        const removed = await FavoriteList.findOneAndDelete({
            user: user._id,
            coach: coachId,
        });
        if (!removed) {
            throw new AppError(404, 'This coach is not in your favorites.');
        }

        res.status(200).json({
            success: true,
            data: 'unfavorited',
        });
    } catch (err) {
        next(err);
    }
};

export const pointToCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const schema = z.object({
            coachId: zodValidation.coachId,
            point: zodValidation.point,
        });

        const result = schema.parse({
            coachId: req.body?.coachId,
            point: req.body?.point,
        });

        // check if coach exists
        const coachExists = await Coach.findById(result.coachId);
        if (!coachExists) throw new AppError(404);

        const givePoint = await Point.findOneAndUpdate(
            { fromUser: user._id, toCoach: result.coachId },
            { point: result.point },
            { upsert: true, new: true }
        );

        if (!givePoint) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const followFacility = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const facilityId = zodValidation.facilityId.parse(req.body?.facilityId);

        // check if facility exists
        const facilityExists = await Facility.findById(facilityId);
        if (!facilityExists) throw new AppError(404);

        // check if already follows this facility
        const alreadyFollowed = await Follow.findOne({
            follower: user._id,
            followingFacility: facilityId,
        });
        if (alreadyFollowed) throw new AppError(409, 'You already follow this facility.');

        const follow = await Follow.create({
            follower: user._id,
            followingFacility: facilityId,
        });
        if (!follow) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfollowFacility = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const facilityId = zodValidation.facilityId.parse(req.body?.facilityId);

        // check if facility exists
        const facilityExists = await Facility.findById(facilityId);
        if (!facilityExists) throw new AppError(404);

        // check if follow exists
        const follow = await Follow.findOne({
            follower: user._id,
            followingFacility: facilityId,
        });
        if (!follow) throw new AppError(404, 'You do not follow this facility.');

        // remove follow
        await Follow.deleteOne({ _id: follow._id });

        res.status(204).json({
            success: true,
            data: 'unfollowed',
        });
    } catch (err) {
        next(err);
    }
};

export const favoriteFacility = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const facilityId = zodValidation.facilityId.parse(req.body?.facilityId);

        // check if facility exists
        const facilityExists = await Facility.findById(facilityId);
        if (!facilityExists) throw new AppError(404);

        try {
            await FavoriteList.create({ user: user._id, facility: facilityId });
        } catch (err) {
            if (err?.code === 11000) {
                throw new AppError(409, 'You already added this facility to favorites.');
            }
            throw err;
        }

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfavoriteFacility = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const facilityId = zodValidation.facilityId.parse(req.body?.facilityId);

        const removed = await FavoriteList.findOneAndDelete({
            user: user._id,
            facility: facilityId,
        });
        if (!removed) {
            throw new AppError(404, 'This facility is not in your favorites.');
        }

        res.status(200).json({
            success: true,
            data: 'unfavorited',
        });
    } catch (err) {
        next(err);
    }
};

export const pointToFacility = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const schema = z.object({
            facilityId: zodValidation.facilityId,
            point: zodValidation.point,
        });

        const result = schema.parse({
            facilityId: req.body?.facilityId,
            point: req.body?.point,
        });

        // check if facility exists
        const facilityExists = await Facility.findById(result.facilityId);
        if (!facilityExists) throw new AppError(404);

        const givePoint = await Point.findOneAndUpdate(
            { fromUser: user._id, toFacility: result.facilityId },
            { point: result.point },
            { upsert: true, new: true }
        );

        if (!givePoint) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const favoriteEvent = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.eventId.parse(req.body?.eventId);

        // check if event exists
        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404);

        try {
            await FavoriteList.create({ user: user._id, event: eventId });
        } catch (err) {
            if (err?.code === 11000) {
                throw new AppError(409, 'You already added this event to favorites.');
            }
            throw err;
        }

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfavoriteEvent = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.eventId.parse(req.body?.eventId);

        const removed = await FavoriteList.findOneAndDelete({
            user: user._id,
            event: eventId,
        });
        if (!removed) {
            throw new AppError(404, 'This event is not in your favorites.');
        }

        res.status(200).json({
            success: true,
            data: 'unfavorited',
        });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/participant/get-favorites
 * Returns the current participant's favorites grouped + flattened. Front-end
 * normalizes `data.favorites` (rows with populated coach/facility/event refs).
 */
export const getFavorites = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const typeRaw = (req.query.type || 'all').toString().toLowerCase();
        const allowedTypes = new Set(['all', 'coach', 'facility', 'event']);
        const type = allowedTypes.has(typeRaw) ? typeRaw : 'all';

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            200,
            Math.max(1, parseInt(req.query.limit, 10) || 100)
        );
        const skip = (page - 1) * limit;

        const sortRaw = (req.query.sort || '-createdAt').toString();
        const sort = {};
        const sortKey = sortRaw.startsWith('-') ? sortRaw.slice(1) : sortRaw;
        sort[sortKey || 'createdAt'] = sortRaw.startsWith('-') ? -1 : 1;

        const filter = { user: user._id };
        if (type === 'coach') {
            filter.coach = { $type: 'objectId' };
        } else if (type === 'facility') {
            filter.facility = { $type: 'objectId' };
        } else if (type === 'event') {
            filter.event = { $type: 'objectId' };
        }

        const [total, rows] = await Promise.all([
            FavoriteList.countDocuments(filter),
            FavoriteList.find(filter)
                .populate({
                    path: 'coach',
                    select: 'name about isVerified membershipLevel point',
                })
                .populate({
                    path: 'facility',
                    select: 'name photo location address',
                })
                .populate({
                    path: 'event',
                    select: 'name photo banner startTime endTime sport facility',
                })
                .sort(sort)
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        // Hydrate coach favorites with the linked User's profile (firstName / lastName / photo)
        // because Coach itself does not store those fields.
        const coachIds = rows
            .filter((row) => row.coach)
            .map((row) => row.coach._id)
            .filter(Boolean);

        if (coachIds.length > 0) {
            const users = await User.find({ coach: { $in: coachIds } })
                .select('firstName lastName photo coach participant')
                .lean();

            const userByCoachId = new Map();
            for (const u of users) {
                if (u?.coach) userByCoachId.set(u.coach.toString(), u);
            }

            rows.forEach((row) => {
                if (!row.coach) return;
                const linkedUser = userByCoachId.get(row.coach._id.toString());
                if (!linkedUser) return;
                row.coach.firstName = linkedUser.firstName;
                row.coach.lastName = linkedUser.lastName;
                row.coach.photo = linkedUser.photo || row.coach.photo;
                row.coach.userId = linkedUser._id;
                row.coach.participantId = linkedUser.participant || null;
            });
        }

        res.status(200).json({
            success: true,
            data: {
                favorites: rows,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                },
                filters: { type, sort: sortRaw },
            },
        });
    } catch (err) {
        next(err);
    }
};

export const pointToEvent = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const schema = z.object({
            eventId: zodValidation.eventId,
            point: zodValidation.point,
        });

        const result = schema.parse({
            eventId: req.body?.eventId,
            point: req.body?.point,
        });

        // check if event exists
        const eventExists = await Event.findById(result.eventId);
        if (!eventExists) throw new AppError(404);

        const givePoint = await Point.findOneAndUpdate(
            { fromUser: user._id, toEvent: result.eventId },
            { point: result.point },
            { upsert: true, new: true }
        );

        if (!givePoint) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const followCompany = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const companyId = zodValidation.companyId.parse(req.body?.companyId);

        // check if company exists
        const companyExists = await Company.findById(companyId);
        if (!companyExists) throw new AppError(404);

        // check if already follows this company
        const alreadyFollowed = await Follow.findOne({
            follower: user._id,
            followingCompany: companyId,
        });
        if (alreadyFollowed) throw new AppError(409, 'You already follow this company.');

        const follow = await Follow.create({
            follower: user._id,
            followingCompany: companyId,
        });
        if (!follow) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfollowCompany = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const companyId = zodValidation.companyId.parse(req.body?.companyId);

        // check if company exists
        const companyExists = await Company.findById(companyId);
        if (!companyExists) throw new AppError(404);

        // check if follow exists
        const follow = await Follow.findOne({
            follower: user._id,
            followingCompany: companyId,
        });
        if (!follow) throw new AppError(404, 'You do not follow this company.');

        // remove follow
        await Follow.deleteOne({ _id: follow._id });

        res.status(204).json({
            success: true,
            data: 'unfollowed',
        });
    } catch (err) {
        next(err);
    }
};

export const followClub = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.clubId.parse(req.body?.clubId);

        // check if club exists
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404);

        // check if already follows this club
        const alreadyFollowed = await Follow.findOne({
            follower: user._id,
            followingClub: clubId,
        });
        if (alreadyFollowed) throw new AppError(409, 'You already follow this club.');

        const follow = await Follow.create({
            follower: user._id,
            followingClub: clubId,
        });
        if (!follow) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfollowClub = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.clubId.parse(req.body?.clubId);

        // check if club exists
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404);

        // check if follow exists
        const follow = await Follow.findOne({
            follower: user._id,
            followingClub: clubId,
        });
        if (!follow) throw new AppError(404, 'You do not follow this club.');

        // remove follow
        await Follow.deleteOne({ _id: follow._id });

        res.status(204).json({
            success: true,
            data: 'unfollowed',
        });
    } catch (err) {
        next(err);
    }
};

function consentFieldsFromParsed(parsed) {
    return {
        acceptHealthNoIllness: parsed.acceptHealthNoIllness,
        acceptHealthNoDisability: parsed.acceptHealthNoDisability,
        acceptHealthNoMedication: parsed.acceptHealthNoMedication,
        acceptHealthSportOk: parsed.acceptHealthSportOk,
        acceptDistantSelling: parsed.acceptDistantSelling,
        acceptEventPurchaseTerms: parsed.acceptEventPurchaseTerms,
    };
}

async function logRegistrationConsent(req, user, eventId, reservationId, consent, legalVersionIds) {
    await RegistrationConsentLog.create({
        user: user._id,
        participant: user.participant,
        event: eventId,
        reservation: reservationId,
        ...consent,
        ipAddress:
            typeof req.headers['x-forwarded-for'] === 'string'
                ? req.headers['x-forwarded-for'].split(',')[0].trim()
                : req.socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
    });

    await Promise.all([
        recordLegalAcceptance(req, user._id, {
            versionId: legalVersionIds.distanceSellingVersionId,
            expectedDocType: 'distance_selling',
            context: 'event_reservation',
            eventId,
            reservationId,
        }),
        recordLegalAcceptance(req, user._id, {
            versionId: legalVersionIds.eventContractVersionId,
            expectedDocType: 'event_contract',
            context: 'event_reservation',
            eventId,
            reservationId,
        }),
    ]);
}

export const makeReservation = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const parsed = zodValidation.makeReservationBodySchema.parse(req.body);
        const eventId = parsed.eventId;
        const consent = consentFieldsFromParsed(parsed);
        const legalVersionIds = {
            distanceSellingVersionId: parsed.distanceSellingVersionId,
            eventContractVersionId: parsed.eventContractVersionId,
        };

        const alreadyReserved = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });
        if (alreadyReserved) throw new AppError(409, 'You already reserved this event.');

        const event = await Event.findById(eventId).select(
            'startTime endTime capacity priceType status style'
        );
        if (!event) throw new AppError(404);

        if (event.status === 'cancelled') {
            throw new AppError(403, 'This event has been cancelled');
        }

        const now = new Date();
        if (event.endTime && now >= event.endTime) {
            throw new AppError(403, 'This event has ended');
        }
        if (now >= event.startTime) {
            throw new AppError(403, 'This event has already started');
        }

        const checkInHours = await resolveCheckInOpensHours(event);
        const checkInDeadline = checkInOpensAt(event.startTime, checkInHours);
        const isWithinDeadline = isWithinCheckInWindow(now, event.startTime, checkInHours);
        const isFreeEvent = event.priceType === 'Free';

        const baseExtra = {
            qr: randomUUID(),
            ...consent,
        };

        const createAndLog = async (doc) => {
            const reservation = await Reservation.create(doc);
            if (!reservation) throw new AppError(404);
            try {
                await logRegistrationConsent(
                    req,
                    user,
                    eventId,
                    reservation._id,
                    consent,
                    legalVersionIds
                );
            } catch (logErr) {
                await Reservation.deleteOne({ _id: reservation._id });
                throw logErr;
            }
            return reservation;
        };

        if (isWithinDeadline) {
            const countCheckedIn = await Reservation.countDocuments({
                event: eventId,
                isCheckedIn: true,
            });

            if (countCheckedIn >= event.capacity) {
                throw new AppError(
                    403,
                    'Event is already full and check-in window has started'
                );
            }

            if (isFreeEvent) {
                const reservation = await createAndLog({
                    participant: user.participant,
                    event: eventId,
                    checkInDeadline,
                    isCheckedIn: true,
                    isPaid: true,
                    isJoined: true,
                    ...baseExtra,
                });

                return res.status(201).json({
                    success: true,
                    data: 'saved',
                    isWithinDeadline: true,
                    checkInOpensHoursBeforeStart: checkInHours,
                    autoCheckedIn: true,
                    qrToken: reservation.qr,
                    reservationId: reservation._id,
                });
            }

            const reservation = await createAndLog({
                participant: user.participant,
                event: eventId,
                checkInDeadline,
                isCheckedIn: false,
                isPaid: false,
                isJoined: true,
                ...baseExtra,
            });

            return res.status(201).json({
                success: true,
                data: 'saved',
                isWithinDeadline: true,
                checkInOpensHoursBeforeStart: checkInHours,
                requiresPayment: true,
                qrToken: reservation.qr,
                reservationId: reservation._id,
            });
        }

        const count = await Reservation.countDocuments({ event: eventId });

        if (count >= event.capacity) {
            const reservation = await createAndLog({
                participant: user.participant,
                event: eventId,
                checkInDeadline,
                isWaitListed: true,
                isJoined: true,
                isPaid: false,
                ...baseExtra,
            });

            return res.status(201).json({
                success: true,
                data: 'saved',
                qrToken: reservation.qr,
                reservationId: reservation._id,
            });
        }

        const reservation = await createAndLog({
            participant: user.participant,
            event: eventId,
            checkInDeadline,
            isJoined: true,
            isPaid: isFreeEvent,
            ...baseExtra,
        });

        return res.status(201).json({
            success: true,
            data: 'saved',
            checkInOpensHoursBeforeStart: checkInHours,
            qrToken: reservation.qr,
            reservationId: reservation._id,
        });
    } catch (err) {
        next(err);
    }
};

export const checkIn = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.eventId.parse(req.body?.eventId);

        // check if event exists
        const eventExists = await Event.findById(eventId).select('startTime status style');
        if (!eventExists) throw new AppError(404);

        if (eventExists.status === 'cancelled') {
            throw new AppError(403, 'This event has been cancelled');
        }

        const now = new Date();
        const checkInHours = await resolveCheckInOpensHours(eventExists);
        const opensAt = checkInOpensAt(eventExists.startTime, checkInHours);

        if (now < opensAt) {
            throw new AppError(403, 'Check-in is not open yet for this event');
        }
        if (now >= eventExists.startTime) {
            throw new AppError(403, 'Check-in closed — event has already started');
        }

        // check if already reserved this event
        const alreadyReserved = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });
        if (!alreadyReserved || !alreadyReserved.isPaid || alreadyReserved.isWaitListed) {
            throw new AppError(403, 'You must have a paid reservation to check in');
        }

        const checkIn = await Reservation.findOneAndUpdate(
            { event: eventId, participant: user.participant },
            { isCheckedIn: true },
            { new: true }
        );
        if (!checkIn) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const confirmPayment = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.eventId.parse(req.body?.eventId);
        const autoCheckIn = req.body?.autoCheckIn === true;

        // Find the reservation
        const reservation = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });

        if (!reservation) {
            throw new AppError(404, 'Reservation not found');
        }

        if (reservation.isPaid) {
            throw new AppError(409, 'Already paid');
        }

        if (reservation.isCancelled) {
            throw new AppError(403, 'Reservation is cancelled');
        }

        // Update payment status
        reservation.isPaid = true;
        
        // Auto check-in if requested (for within deadline payments)
        if (autoCheckIn) {
            reservation.isCheckedIn = true;
        }
        
        await reservation.save();

        res.status(200).json({
            success: true,
            message: autoCheckIn ? 'Payment confirmed and checked in' : 'Payment confirmed',
            reservationId: reservation._id,
            isCheckedIn: reservation.isCheckedIn,
        });
    } catch (err) {
        next(err);
    }
};

export const joinToClubGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubGroupId = zodValidation.mongoObjectId.parse(req.params?.groupId);

        // check if clubGroup exists
        const clubExists = await ClubGroup.findById(clubGroupId);
        if (!clubExists) throw new AppError(404);

        // check if already joined this club
        const alreadyJoined = await JoinGroup.findOne({
            userId: user._id,
            groupId: clubGroupId,
        });
        if (alreadyJoined) throw new AppError(409, 'You already joined this group.');

        // check if invited to this group
        const invite = await Invite.find({ invitee: user._id, group: clubGroupId });

        const joinGroup = await JoinGroup.create({
            userId: user._id,
            groupId: clubGroupId,
            isApproved: invite.length > 0 ? true : false,
        });
        if (!joinGroup) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const leaveClubGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubGroupId = zodValidation.mongoObjectId.parse(req.params.groupId);

        // check if clubGroup exists
        const clubExists = await ClubGroup.findById(clubGroupId);
        if (!clubExists) throw new AppError(404);

        const leaveGroup = await JoinGroup.findOneAndDelete({
            userId: user._id,
            groupId: clubGroupId,
        });
        if (!leaveGroup) throw new AppError(404);

        res.status(204).json({
            success: true,
        });
    } catch (err) {
        next(err);
    }
};

export const followGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubGroupId = zodValidation.mongoObjectId.parse(req.body?.GroupId);

        // check if clubGroup exists
        const clubGroupExists = await ClubGroup.findById(clubGroupId);
        if (!clubGroupExists) throw new AppError(404);

        // check if already follows this clubGroup
        const alreadyFollowed = await Follow.findOne({
            follower: user._id,
            followingClubGroup: clubGroupId,
        });
        if (alreadyFollowed) throw new AppError(409, 'You already follow this group.');

        const follow = await Follow.create({
            follower: user._id,
            followingClubGroup: clubGroupId,
        });
        if (!follow) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const unfollowGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubGroupId = zodValidation.mongoObjectId.parse(req.body?.groupId);

        // check if clubGroup exists
        const clubGroupExists = await Club.findById(clubGroupId);
        if (!clubGroupExists) throw new AppError(404);

        // check if follow exists
        const follow = await Follow.findOne({
            follower: user._id,
            followingClubGroup: clubGroupId,
        });
        if (!follow) throw new AppError(404, 'You do not follow this club.');

        // remove follow
        await Follow.deleteOne({ _id: follow._id });

        res.status(204).json({
            success: true,
            data: 'unfollowed',
        });
    } catch (err) {
        next(err);
    }
};

export const joinToClub = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.mongoObjectId.parse(req.params?.clubId);

        // check if clubGroup exists
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        // check if already joined this club
        const alreadyJoined = await JoinClub.findOne({
            userId: user._id,
            clubId,
        });
        if (alreadyJoined) throw new AppError(409, 'You already joined this club.');

        const joinClub = await JoinClub.create({
            userId: user._id,
            clubId,
        });
        if (!joinClub) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
        });
    } catch (err) {
        next(err);
    }
};

export const leaveClub = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        // check if clubGroup exists
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        const leaveClub = await JoinClub.findOneAndDelete({
            userId: user._id,
            clubId,
        });
        if (!leaveClub) throw new AppError(404);

        res.status(204).json({
            success: true,
        });
    } catch (err) {
        next(err);
    }
};

export const endPhoto = async (req, res, next) => {
    try {
        if (!req.fileMeta) throw new AppError(400, 'No certificate uploaded');
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = JSON.parse(req.body.data);
        const photo = req.fileMeta;
        const user = req.user;
        const eventId = zodValidation.eventId.parse(data.eventId);

        const eventExists = await Event.findById(eventId).select('endTime');
        if (!eventExists) throw new AppError(404, 'Event not found');

        const endedAt = eventExists.endTime ? new Date(eventExists.endTime) : null;
        if (!endedAt || Date.now() < endedAt.getTime()) {
            throw new AppError(403, 'Photos can only be uploaded after the event has ended');
        }

        const isReserved = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });
        if (!isReserved) throw new AppError(403, 'You are not a gamer of this event.');

        const alreadySubmitted = await EventEndPhoto.exists({ user: user._id, event: eventId });
        if (alreadySubmitted) {
            throw new AppError(409, 'You already submitted a photo');
        }

        const submitPhoto = await EventEndPhoto.create({
            user: user._id,
            event: eventId,
            photo,
        });

        res.status(201).json({
            success: true,
            message: 'Photo submitted successfully',
        });
    } catch (err) {
        next(err);
    }
};

/** After event end — shared memories (gamer + coach uploads). Prefer GET route `/get-event/:eventId/end-photos` for consistent access rules. */
export const getEventEndPhotos = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const eventId = zodValidation.eventId.parse(req.body?.eventId);

        const eventDoc = await Event.findById(eventId).select('endTime');
        if (!eventDoc) throw new AppError(404, 'Event not found');

        const endedAt = eventDoc.endTime ? new Date(eventDoc.endTime) : null;
        const ended = !!(endedAt && Date.now() >= endedAt.getTime());
        const hasAny = await EventEndPhoto.exists({ event: eventId });
        if (!ended && !hasAny) {
            return res.status(200).json({ success: true, data: [] });
        }

        const data = await loadMappedEventEndPhotos(eventId);

        res.status(200).json({
            success: true,
            data,
        });
    } catch (err) {
        next(err);
    }
};

export const getFollows = async (req, res, next) => {
    try {
        // Read-only listing: any authenticated user can read their own follow list.
        // (Some accounts may have legacy follows even when participant field is missing.)
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const { type, page = 1, limit = 100 } = req.query;

        const query = { follower: user._id };

        // Optionally filter by type
        if (type && ['coach', 'facility', 'company', 'club', 'group'].includes(type)) {
            if (type === 'group') {
                query.followingClubGroup = { $exists: true, $ne: null };
            } else if (type === 'coach') {
                query.followingCoach = { $exists: true, $ne: null };
            } else if (type === 'facility') {
                query.followingFacility = { $exists: true, $ne: null };
            } else if (type === 'company') {
                query.followingCompany = { $exists: true, $ne: null };
            } else if (type === 'club') {
                query.followingClub = { $exists: true, $ne: null };
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const follows = await Follow.find(query)
            .populate({
                path: 'followingCoach',
                select: 'name membershipLevel point isVerified about'
            })
            .populate({
                path: 'followingFacility',
                select: 'name address photo'
            })
            .populate({
                path: 'followingCompany',
                select: 'name photo'
            })
            .populate({
                path: 'followingClub',
                select: 'name photo'
            })
            .populate({
                path: 'followingClubGroup',
                select: 'name photo clubName'
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        res.status(200).json({
            success: true,
            data: {
                follows,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getParticipantDetails = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const data = req.params.participantId;
        const participantId = zodValidation.mongoObjectId.parse(data);

        const participant = await Participant.findById(participantId).populate([
            {
                path: 'mainSport',
            },
            { path: 'sportGoal' },
        ]);
        if (!participant) throw new AppError(404, 'gamer not found');

        const user = await User.find({
            participant: participantId,
        }).select('-email -phone -isEmailVerified -isPhoneVerified');

        const allData = {
            user,
            participant,
        };

        res.status(200).json({
            success: true,
            data: allData,
        });
    } catch (err) {
        next(err);
    }
};

export const getMyReservations = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const page = parseInt(req.body?.pageNumber) || 1;
        const perPage = parseInt(req.body?.perPage) || 10;
        const skip = (page - 1) * perPage;

        const scopeRaw = req.body?.reservationScope;
        const reservationScope =
            scopeRaw === 'registered' || scopeRaw === 'participated' ? scopeRaw : 'all';

        // Build query for reservations
        const query = {
            participant: user.participant,
            isCancelled: false,
        };

        if (reservationScope === 'registered') {
            query.isCheckedIn = false;
        } else if (reservationScope === 'participated') {
            query.isCheckedIn = true;
        }

        // Count total
        const total = await Reservation.countDocuments(query);

        // Get reservations with populated event data
        const reservations = await Reservation.find(query)
            .populate({
                path: 'event',
                populate: [
                    { path: 'owner', select: 'firstName lastName photo coach' },
                    { path: 'backupCoach', select: 'firstName lastName photo coach' },
                    { path: 'sportGroup', select: 'name' },
                    { path: 'sport', select: 'name' },
                    { path: 'facility', select: 'name address photo' },
                    { path: 'salon', select: 'name' },
                    { path: 'club', select: 'name' },
                    { path: 'group', select: 'name' },
                    {
                        path: 'series',
                        select: 'name frequency interval sessionCount priceType participationFeePerSession status',
                    },
                ],
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(perPage)
            .lean();

        // Transform data to match events format with reservation info
        const eventsWithReservation = reservations
            .filter(r => r.event) // Filter out reservations where event was deleted
            .map(r => ({
                ...r.event,
                eventStyle: r.event.eventStyle || null,
                reservation: {
                    _id: r._id,
                    isApproved: r.isApproved,
                    isPaid: r.isPaid,
                    isCheckedIn: r.isCheckedIn,
                    isWaitListed: r.isWaitListed,
                    checkInDeadline: r.checkInDeadline,
                },
            }));

        res.status(200).json({
            success: true,
            data: eventsWithReservation,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / perPage),
                total,
                perPage,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const enrollInSeries = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const parsed = zodValidation.enrollSeriesSchema.parse(req.body);
        const consent = consentFieldsFromParsed(parsed);
        const legalVersionIds = {
            distanceSellingVersionId: parsed.distanceSellingVersionId,
            eventContractVersionId: parsed.eventContractVersionId,
        };

        const result = await enrollParticipantInSeries({
            user,
            seriesId: parsed.seriesId,
            consent,
            legalVersionIds,
            req,
            logRegistrationConsent,
        });

        res.status(201).json({
            success: true,
            message: `Enrolled in ${result.reservationCount} upcoming session(s).`,
            data: {
                enrollmentId: result.enrollment._id,
                reservationCount: result.reservationCount,
                totalFee: result.totalFee,
            },
        });
    } catch (err) {
        next(err);
    }
};
