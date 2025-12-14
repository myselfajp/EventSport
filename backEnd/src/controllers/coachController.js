import { AppError } from '../utils/appError.js';
import { ObjectId } from 'mongodb';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Event from '../models/eventModel.js';
import Branch from '../models/branchModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import Salon from '../models/salonModel.js';
import Facility from '../models/facilityModel.js';
import Invite from '../models/inviteModel.js';
import Reservation from '../models/reservationModel.js';
import { Sport, EventStyle, SportGroup } from '../models/referenceDataModel.js';
import { JoinPrivateEvent, JoinClub, JoinGroup } from '../models/joinRequestModel.js';
import EventEndPhoto from '../models/eventEndPhotoModel.js';
import { genSecret } from '../utils/secretIdGen.js';
import * as zodValidation from '../utils/validation.js';
import { unlink } from 'fs/promises';

export const createBranch = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const data = JSON.parse(req.body.data);
        const user = req.user;
        const result = zodValidation.createCoachSchema.parse(data);

        // Separate branches by certificate presence (infer behavior)
        const branchesNeedingPhotos = result.filter((branch) => !branch.certificate); // no certificate = need upload

        // Validate photo requirements for new uploads
        if (branchesNeedingPhotos.length > 0 && !req.fileMeta) {
            throw new AppError(400, 'No certificates uploaded for branches requiring photos');
        }

        if (branchesNeedingPhotos.length !== (req.fileMeta?.length || 0)) {
            throw new AppError(
                400,
                'Number of uploaded photos and branches requiring photos do not match'
            );
        }

        // Get or create coach
        let coach = user.coach;
        if (!coach) {
            coach = await Coach.create({
                name: `${user.firstName} ${user.lastName}`,
            });
            const addToUser = await User.findByIdAndUpdate(
                user._id,
                { coach: coach._id },
                { new: true }
            );
            if (!addToUser) throw new AppError(404);
        }

        // Validate no duplicates in request
        const branchOrders = result.map((c) => c.branchOrder);
        const sports = result.map((c) => c.sport);

        if (branchOrders.length !== new Set(branchOrders).size) {
            throw new AppError(400, 'Duplicate branchOrder in request');
        }
        if (sports.length !== new Set(sports).size) {
            throw new AppError(400, 'Duplicate sport in request');
        }

        // Process and validate all branches
        const processedBranches = await Promise.all(
            result.map(async (branchData) => {
                // Verify sport exists
                const sportExists = await Sport.findById(branchData.sport);
                if (!sportExists) throw new AppError(404, `Sport not found: ${branchData.sport}`);

                let certificate;

                if (!branchData.certificate) {
                    // No certificate in data = need to use uploaded file
                    const file = req.fileMeta.find((f) => {
                        const match = f.originalName.match(/sportId=([0-9a-f]{24})/i);
                        return (
                            match &&
                            String(match[1]).toLowerCase() ===
                            String(branchData.sport).toLowerCase()
                        );
                    });

                    if (!file) {
                        throw new AppError(
                            400,
                            `No certificate uploaded for sport ${branchData.sport}`
                        );
                    }

                    certificate = file;
                } else {
                    // Certificate exists in data = use existing certificate
                    if (!branchData.certificate.originalName) {
                        throw new AppError(
                            400,
                            `Certificate originalName required for sport ${branchData.sport}`
                        );
                    }

                    // Validate that certificate matches sportId
                    const match =
                        branchData.certificate.originalName.match(/sportId=([0-9a-f]{24})/i);
                    if (
                        !match ||
                        String(match[1]).toLowerCase() !== String(branchData.sport).toLowerCase()
                    ) {
                        throw new AppError(
                            400,
                            `Certificate originalName does not match sport ID for sport ${branchData.sport}`
                        );
                    }

                    certificate = branchData.certificate;
                }

                return { ...branchData, certificate };
            })
        );

        // Get all existing branches for this coach
        const existingBranches = await Branch.find({ coach: coach._id });

        // Delete certificate files ONLY for branches that need new photos (no certificate in data)
        const sportsNeedingNewPhotos = branchesNeedingPhotos.map((b) => b.sport);
        for (const branch of existingBranches) {
            if (
                sportsNeedingNewPhotos.includes(branch.sport.toString()) &&
                branch.certificate?.path
            ) {
                try {
                    await unlink(branch.certificate.path);
                    console.log(`Deleted old certificate file: ${branch.certificate.path}`);
                } catch (err) {
                    console.warn(
                        `Failed to delete old certificate file: ${branch.certificate.path}`,
                        err
                    );
                }
            }
        }

        // Delete ALL existing branches for this coach
        await Branch.deleteMany({ coach: coach._id });

        // Create all new branches
        const newBranches = await Branch.insertMany(
            processedBranches.map((branch) => ({ coach: coach._id, ...branch }))
        );

        res.status(201).json({
            success: true,
            message: 'Coach/Branch created successfully',
            data: newBranches,
        });
    } catch (err) {
        // CLEANUP ORPHAN FILES ON ERROR
        if (req.fileMeta && req.fileMeta.length > 0) {
            console.warn('Error occurred, cleaning up uploaded files...');
            for (const file of req.fileMeta) {
                try {
                    await unlink(file.path);
                    console.warn(`Cleaned up orphan file: ${file.path}`);
                } catch (unlinkErr) {
                    console.error(`Failed to cleanup orphan file: ${file.path}`, unlinkErr);
                }
            }
        }
        next(err);
    }
};

export const currentBranches = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;

        const branches = await Branch.find({ coach: user.coach })
            .sort({ branchOrder: 1 })
            .populate({
                path: 'sport',
                select: 'name groupName', // only bring back the needed fields
            })
            .lean();
        if (!branches) throw new AppError(404, 'This branch does not exist');
        const result = branches.map((branch) => ({
            ...branch,
            sportName: branch.sport?.name,
            sportGroup: branch.sport?.groupName,
            sport: branch.sport?._id, // optional: remove the nested object if you don’t want it
        }));

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        if (Object.keys(req.fileMeta).length !== 2)
            throw new AppError(400, 'Both event banner and event photo is required');
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = JSON.parse(req.body.data);
        const user = req.user;

        // get dates if provided
        if (data.startTime) {
            data.startTime = new Date(data.startTime);
        }
        if (data.endTime) {
            data.endTime = new Date(data.endTime);
        }

        const result = zodValidation.createEventSchema.parse(data ?? {});

        // check if data exist
        const checks = [
            { id: result.club, model: Club, name: 'Club' },
            { id: result.group, model: ClubGroup, name: 'ClubGroup' },
            { id: result.sportGroup, model: SportGroup, name: 'SportGroup' },
            { id: result.sport, model: Sport, name: 'sport' },
            ...(result.salon ? [{ id: result.salon, model: Salon, name: 'Salon' }] : []),
            ...(result.facility
                ? [{ id: result.facility, model: Facility, name: 'Facility' }]
                : []),
        ];

        const models = await Promise.all(
            checks.map(async ({ id, model, name }) => {
                const exists = await model.exists({ _id: new ObjectId(id) });
                return { name, exists: Boolean(exists) };
            })
        );

        const allValid = models.every((r) => r.exists);
        if (!allValid) {
            const notFound = models.filter((r) => !r.exists).map((r) => r.name);
            throw new AppError(404, `${notFound.join(', ')} not found`);
        }

        // Fetch EventStyle to populate eventStyle field
        const eventStyleData = await EventStyle.findById(result.style);
        if (!eventStyleData) {
            throw new AppError(404, 'EventStyle not found');
        }
        result.eventStyle = {
            name: eventStyleData.name,
            color: eventStyleData.color,
        };

        if (result.private && result.private === true) {
            result.secretId = genSecret();
        }

        if (result.priceType === 'Free') {
            result.participationFee = 0;
        }

        // insert photos to result object
        result.banner = req.fileMeta['event-banner'][0];
        result.photo = req.fileMeta['event-photo'][0];

        const createEvent = await Event.create({ owner: user._id, ...result });
        if (!createEvent) throw new AppError(500);
        const { secretId, ...event } = createEvent.toObject();

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const eventId = zodValidation.mongoObjectId.parse(req.params.eventId);

        const eventExists = await Event.findById(groupId);
        if (!eventExists) throw new AppError(404, 'Event not found');
        if (!(eventExists.owner.equals(user._id) || user.role === 0)) {
            await ClubGroup.findByIdAndDelete(eventId);
        } else {
            throw new AppError(403, 'You are not Event creator');
        }

        res.status(204).json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const joinBackupCoach = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.mongoObjectId.parse(req.params?.eventId);

        const eventExists = await Event.findById(result);
        if (!eventExists) throw new AppError(404, 'This Event does not exist');

        if (eventExists.backupCoach) throw new AppError(409, 'Backup coach already exists');
        if (eventExists.owner?.equals(user._id))
            throw new AppError(403, 'You are already a coach in this event');

        const addToEvent = await Event.findByIdAndUpdate(
            result,
            { backupCoach: user._id },
            { new: true }
        );
        if (!addToEvent) throw new AppError(404);

        res.status(201).json({
            success: true,
            message: 'Backup coach joined successfully',
            data: addToEvent,
        });
    } catch (err) {
        next(err);
    }
};

export const createGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);
        const result = zodValidation.createGroupSchema.parse(data);
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const createGroup = await ClubGroup.create({
            owner: user.coach,
            clubId,
            clubName: clubExists.name,
            ...result,
        });

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: createGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const editGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);

        if (req.fileMeta) {
            data.photo = req.fileMeta;
        }

        const result = zodValidation.editGroupSchema.parse(data);
        const groupId = zodValidation.mongoObjectId.parse(req.params.groupId);

        const groupExists = await ClubGroup.findById(groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');
        if (!(groupExists.owner.equals(user.coach) || user.role === 0))
            throw new AppError(403, 'You are not group creator');

        const editGroup = await ClubGroup.findByIdAndUpdate(groupId, { ...result }, { new: true });

        res.status(201).json({
            success: true,
            message: 'Group edited successfully',
            data: editGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const groupId = zodValidation.mongoObjectId.parse(req.params.groupId);

        const groupExists = await ClubGroup.findById(groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');
        if (!(groupExists.owner.equals(user.coach) || user.role === 0)) {
            await ClubGroup.findByIdAndDelete(groupId);
        } else {
            throw new AppError(403, 'You are not group creator');
        }

        res.status(204).json({
            success: true,
            message: 'Group deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const createClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);
        const result = zodValidation.createClubSchema.parse(data);

        // check for president
        if (result.president) {
            const exists = await User.exists({ _id: new ObjectId(result.president) });
            if (!exists) throw new AppError(404, 'President not found');
        }

        // check for coaches array
        if (result.coaches.length > 0) {
            const checks = await Promise.all(
                result.coaches.map(async (id) => {
                    const exists = await User.exists({ coach: new ObjectId(id) });
                    return { id, exists: Boolean(exists) };
                })
            );
            const allValid = checks.every((r) => r.exists);
            if (!allValid) {
                const notFound = checks.filter((r) => !r.exists).map((r) => r.id);
                throw new AppError(404, `Coach with id: ${notFound.join(', ')} not found`);
            }
        }

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const createClub = await Club.create({
            creator: user._id,
            ...result,
        });

        res.status(201).json({
            success: true,
            message: 'Club created successfully',
            data: createClub,
        });
    } catch (err) {
        next(err);
    }
};

export const editClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);
        const result = zodValidation.editClubSchema.parse(data);
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        // check for club
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        // check for ownership
        if (!(clubExists.creator.equals(user._id) || user.role === 0))
            throw new AppError(403, 'You are not Club creator');

        // check for president
        if (result.president) {
            const exists = await User.exists({ _id: new ObjectId(result.president) });
            if (!exists) throw new AppError(404, 'President not found');
        }

        // check for coaches array
        if (result.coaches.length > 0) {
            const checks = await Promise.all(
                result.coaches.map(async (id) => {
                    const exists = await User.exists({ coach: new ObjectId(id) });
                    return { id, exists: Boolean(exists) };
                })
            );
            const allValid = checks.every((r) => r.exists);
            if (!allValid) {
                const notFound = checks.filter((r) => !r.exists).map((r) => r.id);
                throw new AppError(404, `Coach with id: ${notFound.join(', ')} not found`);
            }
        }

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const editClub = await Club.findByIdAndUpdate(clubId, { ...result }, { new: true });

        res.status(201).json({
            success: true,
            message: 'Club edited successfully',
            data: editClub,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        // check for club
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        // check for ownership
        if (!(clubExists.creator.equals(user._id) || user.role === 0))
            throw new AppError(403, 'You are not Club creator');

        await Club.findByIdAndDelete(clubId);

        res.status(204).json({
            success: true,
            message: 'Club deleted successfully',
            data: deleteClub,
        });
    } catch (err) {
        next(err);
    }
};

// join requests

export const approveJoinGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinGroupSchema.parse(req.body);

        const groupExists = await ClubGroup.findById(result.groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!groupExists.isApproved) {
            throw new AppError(403, 'Group is not approved');
        }

        if (!groupExists.owner.equals(user.coach) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        const approve = await JoinGroup.findOneAndUpdate(
            { userId: result.userId, groupId: result.groupId },
            {
                isApproved: true,
            }
        );
        if (!approve) throw new AppError(404, 'Join request not found');

        res.status(201).json({
            success: true,
            message: 'Joined to group successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const approveJoinClub = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinClubSchema.parse(req.body);

        const clubExists = await Club.findById(result.clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!clubExists.isApproved) {
            throw new AppError(403, 'Club is not approved');
        }

        if (!clubExists.creator.equals(user._id) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        const approve = await JoinClub.findOneAndUpdate(
            { userId: result.userId, clubId: result.clubId },
            {
                isApproved: true,
            }
        );
        if (!approve) throw new AppError(404, 'Join request not found');

        res.status(201).json({
            success: true,
            message: 'Joined to group successfully',
        });
    } catch (err) {
        next(err);
    }
};

// invite requests
export const inviteGroup = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinGroupSchema.parse(req.body);

        const groupExists = await ClubGroup.findById(result.groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!groupExists.isApproved) {
            throw new AppError(403, 'Group is not approved');
        }

        if (!groupExists.owner.equals(user.coach) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        // check if already invited to this group
        const alreadyInvited = await Invite.exists({
            invitee: user._id,
            group: result.groupId,
        });
        if (alreadyInvited) throw new AppError(409, 'You already invited this user.');

        const invite = await Invite.create({
            inviter: user.coach,
            invitee: result.userId,
            group: result.groupId,
        });

        res.status(201).json({
            success: true,
            message: 'Invited to group successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const inviteEvent = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinEventSchema.parse(req.body);

        const eventExists = await Event.findById(result.eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        // check if already invited to this event
        const alreadyInvited = await Invite.exists({
            invitee: result.userId,
            event: result.eventId,
        });
        if (alreadyInvited) throw new AppError(409, 'You already invited this user.');

        const invite = await Invite.create({
            inviter: user.coach,
            invitee: result.userId,
            event: result.eventId,
        });

        res.status(201).json({
            success: true,
            message: 'Invited to event successfully',
        });
    } catch (err) {
        next(err);
    }
};

// end photo
export const endPhoto = async (req, res, next) => {
    try {
        if (!req.fileMeta) throw new AppError(400, 'No certificate uploaded');
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = JSON.parse(req.body.data);
        const photo = req.fileMeta;
        const user = req.user;
        const eventId = zodValidation.eventId.parse(data.eventId);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        const alreadySubmitted = await EventEndPhoto.exists({ coach: user.coach, event: eventId });
        if (alreadySubmitted) {
            throw new AppError(409, 'You already submitted a photo');
        }

        const submitPhoto = await EventEndPhoto.create({
            coach: user.coach,
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

export const getEventParticipants = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = req.params.eventId;
        const user = req.user;
        const eventId = zodValidation.eventId.parse(data);
        const { perPage, pageNumber, ...filters } = zodValidation.getEventParticipants.parse(
            req.body
        );
        const skip = (pageNumber - 1) * perPage;

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        const query = { event: eventId, ...filters };

        const totalParticipants = await Reservation.countDocuments(query);
        const getEventParticipants = await Reservation.find(query)
            .skip(skip)
            .limit(perPage)
            .populate([
                {
                    path: 'participant',
                    populate: [
                        { path: 'mainSport', select: 'name' },
                        { path: 'sportGoal', select: 'name' },
                    ],
                },
                { path: 'event', select: 'name' },
            ])
            .lean();

        for (let res of getEventParticipants) {
            res.user = await User.findOne(
                { participant: res.participant._id },
                'firstName lastName'
            );
        }
        res.status(200).json({
            success: true,
            data: getEventParticipants,
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

export const approveReservation = async (req, res, next) => {
    try {
        if (!req.user || !req.user.coach) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = req.params.requestId;
        const user = req.user;
        const requestId = zodValidation.mongoObjectId.parse(data);

        const reqExists = await Reservation.findById(requestId);
        if (!reqExists) throw new AppError(404, 'Request not found');

        const eventExists = await Event.findById(reqExists.event);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        reqExists.isApproved = true;
        await reqExists.save();
        res.status(201).json({
            success: true,
            data: reqExists,
        });
    } catch (err) {
        next(err);
    }
};

export const getCoachDetails = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const data = req.params.coachId;
        const coachId = zodValidation.coachId.parse(data);

        const coach = await Coach.findById(coachId);
        if (!coach) throw new AppError(404, 'Coach not found');

        const user = await User.findOne({
            coach: coachId,
        }).select('-email -phone -isEmailVerified -isPhoneVerified');

        const club = await Club.find({ creator: user._id });
        const clubGroup = await ClubGroup.find({ owner: coachId });
        const branch = await Branch.find({ coach: coachId }).populate({
            path: 'sport',
            select: 'name groupName',
        });
        const event = await Event.find({
            $or: [{ owner: user._id }, { backupCoach: user._id }],
        }).populate([
            { path: 'club', select: 'name' },
            { path: 'group', select: 'name' },
            { path: 'sport', select: 'name' },
            { path: 'sportGroup', select: 'name' },
            { path: 'style', select: 'name' },
            { path: 'salon', select: 'name' },
            { path: 'facility', select: 'name' },
        ]);

        const allData = {
            coach,
            user,
            club,
            clubGroup,
            branch,
            event,
        };

        res.status(200).json({
            success: true,
            data: allData,
        });
    } catch (err) {
        next(err);
    }
};
