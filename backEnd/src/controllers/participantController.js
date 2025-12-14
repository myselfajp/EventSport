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
import { z } from 'zod';
import * as zodValidation from '../utils/validation.js';

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

        // check if already follows this coach
        const alreadyFollowed = await Follow.findOne({
            follower: user._id,
            followingCoach: coachId,
        });
        if (alreadyFollowed) throw new AppError(409, 'You already follow this coach.');

        const follow = await Follow.create({
            follower: user._id,
            followingCoach: coachId,
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

        // check if already favorited this coach
        const alreadyFavorited = await FavoriteList.findOne({
            user: user._id,
            coach: coachId,
        });

        if (alreadyFavorited) throw new AppError(409, 'You already added this coach to favorites.');

        const addToFavorites = await FavoriteList.create({
            user: user._id,
            coach: coachId,
        });
        if (!addToFavorites) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
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

        // check if already favorited this facility
        const alreadyFavorited = await FavoriteList.findOne({
            user: user._id,
            facility: facilityId,
        });

        if (alreadyFavorited)
            throw new AppError(409, 'You already added this facility to favorites.');

        const addToFavorites = await FavoriteList.create({
            user: user._id,
            facility: facilityId,
        });
        if (!addToFavorites) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
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

        // check if already favorited this event
        const alreadyFavorited = await FavoriteList.findOne({
            user: user._id,
            event: eventId,
        });

        if (alreadyFavorited) throw new AppError(409, 'You already added this event to favorites.');

        const addToFavorites = await FavoriteList.create({
            user: user._id,
            event: eventId,
        });
        if (!addToFavorites) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
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

export const makeReservation = async (req, res, next) => {
    try {
        if (!req.user || !req.user.participant) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.eventId.parse(req.body?.eventId);

        // check if already reserved this event
        const alreadyReserved = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });
        if (alreadyReserved) throw new AppError(409, 'You already reserved this event.');

        const event = await Event.findById(eventId).select('startTime capacity');

        if (!event) throw new AppError(404);

        // check this event starttime
        const now = new Date();
        const twoDaysBefore = new Date(event.startTime.getTime() - 2 * 24 * 60 * 60 * 1000);
        const timeDiff = event.startTime - now; // difference in milliseconds
        const twoDaysInMs = 2 * 24 * 60 * 60 * 1000;

        if (timeDiff < twoDaysInMs) {
            const countCheckedIn = await Reservation.countDocuments({
                event: eventId,
                isCheckedIn: true,
            });

            if (countCheckedIn >= event.capacity) {
                throw new AppError(403, 'Event is already full and less than 2 days remaining');
            }
            const reserveAndCheckIn = await Reservation.create({
                participant: user.participant,
                event: eventId,
                checkInDeadline: twoDaysBefore,
                isCheckedIn: true,
            });
            if (!reserveAndCheckIn) throw new AppError(404);

            return res.status(201).json({
                success: true,
                data: 'saved',
            });
        }

        // check for capacity
        const count = await Reservation.countDocuments({ event: eventId });

        if (count >= event.capacity) {
            const reserveAndWaitlist = await Reservation.create({
                participant: user.participant,
                event: eventId,
                checkInDeadline: twoDaysBefore,
                isWaitListed: true,
            });
            if (!reserveAndWaitlist) throw new AppError(404);

            return res.status(201).json({
                success: true,
                data: 'saved',
            });
        }

        const reserve = await Reservation.create({
            participant: user.participant,
            event: eventId,
            checkInDeadline: twoDaysBefore,
        });
        if (!reserve) throw new AppError(404);

        res.status(201).json({
            success: true,
            data: 'saved',
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
        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404);

        // check if already reserved this event
        const alreadyReserved = await Reservation.findOne({
            user: user._id,
            event: eventId,
        });
        if (!alreadyReserved || !alreadyReserved.isPaid || alreadyReserved.isWaitListed) {
            throw new AppError(403, 'Already reserved');
        }

        const checkIn = await Reservation.findOneAndUpdate(
            { event: eventId, user: user._id },
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

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        const isReserved = await Reservation.findOne({
            participant: user.participant,
            event: eventId,
        });
        if (!isReserved) throw new AppError(403, 'You are not a participant of this event.');

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
        if (!participant) throw new AppError(404, 'participant not found');

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
