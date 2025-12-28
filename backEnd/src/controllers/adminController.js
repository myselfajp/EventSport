import mongoose from 'mongoose';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Branch from '../models/branchModel.js';
import Event from '../models/eventModel.js';
import Reservation from '../models/reservationModel.js';
import Participant from '../models/participantModel.js';
import Facility from '../models/facilityModel.js';
import Salon from '../models/salonModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import { AppError } from '../utils/appError.js';
import { SearchQuerySchema, mongoObjectId, signupSchema, editUserSchema } from '../utils/validation.js';
import argon2 from 'argon2';
import { checkPasswordStrength } from '../utils/passwordStrength.js';

export const getAdminPanel = async (req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            message: 'Admin panel access granted',
            data: {
                user: {
                    id: req.user._id,
                    email: req.user.email,
                    firstName: req.user.firstName,
                    lastName: req.user.lastName,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

// User Management
export const getAllUsers = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search, profileType } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
            profileType: req.body?.profileType || req.query?.profileType,
        });

        const query = {};
        if (search) {
            query.$or = [
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } },
            ];
        }

        if (profileType === 'participant') {
            query.participant = { $exists: true, $ne: null };
        } else if (profileType === 'coach') {
            query.coach = { $exists: true, $ne: null };
        } else if (profileType === 'facility') {
            query.facility = { $exists: true, $ne: null, $not: { $size: 0 } };
        }

        const users = await User.find(query)
            .select('-password -failedLoginAttempts -accountLockedUntil')
            .populate({
                path: 'participant',
                select: 'name mainSport skillLevel',
                populate: {
                    path: 'mainSport',
                    select: 'name groupName',
                },
            })
            .populate('coach', 'name isVerified')
            .populate('facility', 'name mainSport')
            .skip((pageNumber - 1) * perPage)
            .limit(perPage)
            .sort({ createdAt: -1 });

        const usersWithSummary = await Promise.all(
            users.map(async (user) => {
                const summary = {};

                if (user.coach) {
                    const coachId = user.coach._id;
                    const approvedBranches = await Branch.find({
                        coach: coachId,
                        status: 'Approved',
                    }).populate('sport', 'name groupName').lean();
                    
                    const approvedBranchesCount = approvedBranches.length;
                    const sports = approvedBranches.map((branch) => ({
                        name: branch.sport?.name || 'Unknown',
                        groupName: branch.sport?.groupName || '',
                    }));
                    
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const eventsCount = await Event.countDocuments({
                        owner: user._id,
                        startTime: { $lte: today },
                    });
                    summary.coach = {
                        certificateCount: approvedBranchesCount,
                        eventsCount,
                        sports,
                    };
                }

                if (user.participant) {
                    const participantId = user.participant._id;
                    const joinedEventsCount = await Reservation.countDocuments({
                        participant: participantId,
                        isJoined: true,
                    });
                    summary.participant = {
                        joinedEventsCount,
                    };
                }

                if (user.facility && user.facility.length > 0) {
                    const facilityIds = user.facility.map((f) => f._id || f);
                    const salonsCount = await Salon.countDocuments({
                        facility: { $in: facilityIds },
                    });
                    summary.facility = {
                        facilityCount: user.facility.length,
                        salonsCount,
                    };
                }

                if (user.coach) {
                    const coachId = user.coach._id;
                    const clubsAsCreator = await Club.countDocuments({ creator: user._id });
                    const clubsAsCoach = await Club.countDocuments({ coaches: user._id });
                    const totalClubs = clubsAsCreator + clubsAsCoach;
                    const groupsCount = await ClubGroup.countDocuments({ owner: coachId });
                    if (totalClubs > 0 || groupsCount > 0) {
                        summary.club = {
                            clubCount: totalClubs,
                            groupsCount,
                        };
                    }
                }

                return {
                    ...user.toObject(),
                    summary,
                };
            })
        );

        const total = await User.countDocuments(query);

        res.status(200).json({
            success: true,
            data: usersWithSummary,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const createUser = async (req, res, next) => {
    try {
        const body = req.body || {};
        if (body.age) {
            body.age = new Date(body.age);
        }

        const result = signupSchema.parse(body);

        const passwordCheck = checkPasswordStrength(result.password);
        if (!passwordCheck.valid) {
            throw new AppError(400, passwordCheck.message);
        }

        const existingUser = await User.findOne({ email: result.email });
        if (existingUser) {
            throw new AppError(409, 'Email already registered');
        }

        const hashedPassword = await argon2.hash(result.password);
        const { password, ...userData } = result;

        const user = await User.create({
            ...userData,
            password: hashedPassword,
        });

        const { password: pass, ...userWithoutPassword } = user.toObject();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            data: userWithoutPassword,
        });
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const body = req.body || {};

        if (body.age) {
            body.age = new Date(body.age);
        }

        const updateData = { ...body };
        let passwordHash = null;

        if (updateData.newPassword) {
            const passwordCheck = checkPasswordStrength(updateData.newPassword);
            if (!passwordCheck.valid) {
                throw new AppError(400, passwordCheck.message);
            }

            passwordHash = await argon2.hash(updateData.newPassword);
            delete updateData.newPassword;
        }
        delete updateData.oldPassword;

        if (updateData.email) {
            const existingUser = await User.findOne({ email: updateData.email, _id: { $ne: userId } });
            if (existingUser) {
                throw new AppError(409, 'Email already in use');
            }
        }

        const result = editUserSchema.parse(updateData);

        if (passwordHash) {
            result.password = passwordHash;
        }

        const updatedUser = await User.findByIdAndUpdate(userId, result, { new: true })
            .select('-password -failedLoginAttempts -accountLockedUntil');

        if (!updatedUser) {
            throw new AppError(404, 'User not found');
        }

        if (updatedUser.coach && (result.firstName || result.lastName)) {
            const newName = `${updatedUser.firstName} ${updatedUser.lastName}`;
            await Coach.findByIdAndUpdate(updatedUser.coach, { name: newName });
        }

        res.status(200).json({
            success: true,
            message: 'User updated successfully',
            data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);

        if (userId.toString() === req.user._id.toString()) {
            throw new AppError(400, 'Cannot delete your own account');
        }

        const user = await User.findByIdAndDelete(userId);
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        res.status(200).json({
            success: true,
            message: 'User deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

// Coach Certificate Approval
export const getPendingCoaches = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
        });

        const branches = await Branch.find({ status: 'Pending' })
            .populate({
                path: 'coach',
                select: 'name isVerified',
            })
            .populate('sport', 'name groupName')
            .sort({ createdAt: -1 })
            .lean();

        let filteredBranches = branches;

        if (search) {
            const searchLower = search.toLowerCase();
            filteredBranches = branches.filter((branch) => {
                const coachName = branch.coach?.name || '';
                const sportName = branch.sport?.name || '';
                return coachName.toLowerCase().includes(searchLower) || sportName.toLowerCase().includes(searchLower);
            });
        }

        const total = filteredBranches.length;
        const paginatedBranches = filteredBranches.slice((pageNumber - 1) * perPage, pageNumber * perPage);

        const branchesWithUser = await Promise.all(
            paginatedBranches.map(async (branch) => {
                const user = await User.findOne({ coach: branch.coach._id }).select('firstName lastName email phone photo').lean();
                return {
                    ...branch,
                    user,
                };
            })
        );

        res.status(200).json({
            success: true,
            data: branchesWithUser,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const approveCertificate = async (req, res, next) => {
    try {
        const branchId = mongoObjectId.parse(req.params.branchId);

        const branch = await Branch.findByIdAndUpdate(
            branchId,
            { status: 'Approved' },
            { new: true }
        ).populate('coach');

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        if (branch.status === 'Approved') {
            const coach = await Coach.findById(branch.coach._id);
            if (coach && !coach.isVerified) {
                const allBranches = await Branch.find({ coach: coach._id });
                const allApproved = allBranches.every((b) => b.status === 'Approved');
                if (allApproved) {
                    await Coach.findByIdAndUpdate(coach._id, { isVerified: true });
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Certificate approved successfully',
            data: branch,
        });
    } catch (err) {
        next(err);
    }
};

export const rejectCertificate = async (req, res, next) => {
    try {
        const branchId = mongoObjectId.parse(req.params.branchId);

        const branch = await Branch.findByIdAndUpdate(
            branchId,
            { status: 'Rejected' },
            { new: true }
        );

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        res.status(200).json({
            success: true,
            message: 'Certificate rejected successfully',
            data: branch,
        });
    } catch (err) {
        next(err);
    }
};

export const getCoachDetails = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('coach');

        if (!user || !user.coach) {
            throw new AppError(404, 'User or coach profile not found');
        }

        const coachId = user.coach._id;

        const approvedBranches = await Branch.find({
            coach: coachId,
            status: 'Approved',
        }).populate('sport', 'name groupName');

        const certificateCount = approvedBranches.length;
        const sports = approvedBranches.map((branch) => ({
            _id: branch.sport._id,
            name: branch.sport.name,
            groupName: branch.sport.groupName,
        }));

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const eventsCount = await Event.countDocuments({
            owner: userId,
            startTime: { $lte: today },
        });

        res.status(200).json({
            success: true,
            data: {
                certificateCount,
                sports,
                eventsCount,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getParticipantDetails = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('participant');

        if (!user || !user.participant) {
            throw new AppError(404, 'User or participant profile not found');
        }

        const participantId = user.participant._id;

        const reservations = await Reservation.find({
            participant: participantId,
            isJoined: true,
        })
            .populate({
                path: 'event',
                select: 'name startTime endTime sport',
                populate: {
                    path: 'sport',
                    select: 'name groupName',
                },
            })
            .sort({ createdAt: -1 })
            .lean();

        const events = reservations
            .filter((r) => r.event)
            .map((r) => ({
                _id: r.event._id,
                name: r.event.name,
                startTime: r.event.startTime,
                endTime: r.event.endTime,
                sport: r.event.sport,
            }));

        const participant = await Participant.findById(participantId).populate('mainSport', 'name groupName');

        res.status(200).json({
            success: true,
            data: {
                events,
                mainSport: participant.mainSport,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getFacilityDetails = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId);

        if (!user || !user.facility || user.facility.length === 0) {
            throw new AppError(404, 'User or facility profile not found');
        }

        const facilities = await Facility.find({
            _id: { $in: user.facility },
        })
            .populate('mainSport', 'name groupName')
            .lean();

        const facilityIds = facilities.map((f) => f._id);

        const salons = await Salon.find({
            facility: { $in: facilityIds },
        })
            .populate('sport', 'name groupName')
            .populate('sportGroup', 'name')
            .lean();

        const facilitiesWithSalons = facilities.map((facility) => {
            const facilitySalons = salons.filter(
                (salon) => salon.facility.toString() === facility._id.toString()
            );
            return {
                ...facility,
                salonCount: facilitySalons.length,
                salons: facilitySalons.map((salon) => ({
                    _id: salon._id,
                    name: salon.name,
                    sport: salon.sport,
                    sportGroup: salon.sportGroup,
                })),
            };
        });

        res.status(200).json({
            success: true,
            data: {
                facilityCount: facilities.length,
                facilities: facilitiesWithSalons,
                totalSalons: salons.length,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getClubDetails = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('coach');

        if (!user) {
            throw new AppError(404, 'User not found');
        }

        const clubsAsCreator = await Club.find({
            creator: userId,
        }).lean();

        const clubsAsCoach = user.coach
            ? await Club.find({
                  coaches: userId,
              }).lean()
            : [];

        const allClubIds = [
            ...new Set([
                ...clubsAsCreator.map((c) => c._id.toString()),
                ...clubsAsCoach.map((c) => c._id.toString()),
            ]),
        ].map((id) => new mongoose.Types.ObjectId(id));

        const clubs = await Club.find({
            _id: { $in: allClubIds },
        }).lean();

        const coachId = user.coach?._id;

        const groups = coachId
            ? await ClubGroup.find({
                  owner: coachId,
              })
                  .populate('clubId', 'name')
                  .lean()
            : [];

        const clubsWithGroups = clubs.map((club) => {
            const clubGroups = groups.filter(
                (group) => group.clubId._id.toString() === club._id.toString()
            );
            return {
                ...club,
                groupCount: clubGroups.length,
                groups: clubGroups.map((group) => ({
                    _id: group._id,
                    name: group.name,
                    clubName: group.clubName,
                })),
            };
        });

        res.status(200).json({
            success: true,
            data: {
                clubCount: clubs.length,
                clubs: clubsWithGroups,
                totalGroups: groups.length,
            },
        });
    } catch (err) {
        next(err);
    }
};
