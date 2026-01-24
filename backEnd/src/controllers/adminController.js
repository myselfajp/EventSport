import mongoose from 'mongoose';
import { unlink } from 'fs/promises';
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
import { Sport } from '../models/referenceDataModel.js';
import StaticPage from '../models/staticPageModel.js';
import { AppError } from '../utils/appError.js';
import { SearchQuerySchema, mongoObjectId, signupSchema, adminCreateUserSchema, editUserSchema } from '../utils/validation.js';
import * as zodValidation from '../utils/validation.js';
import argon2 from 'argon2';
import { checkPasswordStrength } from '../utils/passwordStrength.js';
import { notifyCertificateApproved, notifyCertificateRejected } from '../utils/notificationHelper.js';

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
            .populate('termsAccepted.versionId', 'docType version title isActive')
            .populate('kvkkConsent.versionId', 'docType version title isActive')
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
                    }).populate('sport', 'name groupName icon').lean();
                    
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

        const result = adminCreateUserSchema.parse(body);

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
            termsAccepted: null,
            kvkkConsent: null,
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
            .populate('sport', 'name groupName icon')
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
        )
            .populate('coach')
            .populate('sport', 'name icon');

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

            // Find user who owns this coach
            const user = await User.findOne({ coach: branch.coach._id });
            if (user) {
                try {
                    await notifyCertificateApproved(
                        user._id,
                        branch._id,
                        branch.sport?.name || 'Unknown Sport',
                        branch.level
                    );
                } catch (notifErr) {
                    console.error('Failed to create notification:', notifErr);
                    // Don't fail the request if notification fails
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
        )
            .populate('coach')
            .populate('sport', 'name icon');

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        // Find user who owns this coach
        const user = await User.findOne({ coach: branch.coach._id });
        if (user) {
            try {
                await notifyCertificateRejected(
                    user._id,
                    branch._id,
                    branch.sport?.name || 'Unknown Sport',
                    branch.level
                );
            } catch (notifErr) {
                console.error('Failed to create notification:', notifErr);
                // Don't fail the request if notification fails
            }
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

        const allBranches = await Branch.find({
            coach: coachId,
        })
            .populate('sport', 'name groupName icon')
            .sort({ createdAt: -1 })
            .lean();

        const approvedBranches = allBranches.filter((b) => b.status === 'Approved');
        const certificateCount = approvedBranches.length;

        const branches = allBranches.map((branch) => ({
            _id: branch._id,
            sport: {
                _id: branch.sport._id,
                name: branch.sport.name,
                groupName: branch.sport.groupName,
                icon: branch.sport.icon,
            },
            level: branch.level,
            branchOrder: branch.branchOrder,
            status: branch.status,
            certificate: branch.certificate,
            createdAt: branch.createdAt,
        }));

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
                branches,
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
            .populate('sport', 'name groupName icon')
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

export const getCoachBranches = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('coach');

        if (!user || !user.coach) {
            throw new AppError(404, 'User or coach profile not found');
        }

        const branches = await Branch.find({ coach: user.coach._id })
            .sort({ branchOrder: 1 })
            .populate({
                path: 'sport',
                select: 'name groupName icon',
            })
            .lean();

        const result = branches.map((branch) => ({
            ...branch,
            sportName: branch.sport?.name,
            sportGroup: branch.sport?.groupName,
            sport: branch.sport?._id,
            sportIcon: branch.sport?.icon,
        }));

        const coach = await Coach.findById(user.coach._id);

        res.status(200).json({
            success: true,
            data: {
                branches: result,
                about: coach?.about || '',
            },
        });
    } catch (err) {
        next(err);
    }
};

export const updateCoachProfile = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('coach');

        if (!user || !user.coach) {
            throw new AppError(404, 'User or coach profile not found');
        }

        const data = JSON.parse(req.body.data);
        const result = zodValidation.createCoachSchema.parse(data);

        const branchesNeedingPhotos = result.filter((branch) => !branch.certificate);

        if (branchesNeedingPhotos.length > 0 && !req.fileMeta) {
            throw new AppError(400, 'No certificates uploaded for branches requiring photos');
        }

        if (branchesNeedingPhotos.length !== (req.fileMeta?.length || 0)) {
            throw new AppError(
                400,
                'Number of uploaded photos and branches requiring photos do not match'
            );
        }

        const coachId = user.coach._id;

        const processedBranches = await Promise.all(
            result.map(async (branchData) => {
                const sportExists = await Sport.findById(branchData.sport);
                if (!sportExists) throw new AppError(404, `Sport not found: ${branchData.sport}`);

                let certificate;

                if (!branchData.certificate) {
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
                    if (!branchData.certificate.originalName) {
                        throw new AppError(
                            400,
                            `Certificate originalName required for sport ${branchData.sport}`
                        );
                    }

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

        const existingBranches = await Branch.find({ coach: coachId });

        const sportsNeedingNewPhotos = branchesNeedingPhotos.map((b) => b.sport);
        for (const branch of existingBranches) {
            if (
                sportsNeedingNewPhotos.includes(branch.sport.toString()) &&
                branch.certificate?.path
            ) {
                try {
                    await unlink(branch.certificate.path);
                } catch (err) {
                    console.warn(`Failed to delete old certificate file: ${branch.certificate.path}`, err);
                }
            }
        }

        await Branch.deleteMany({ coach: coachId });

        const newBranches = await Branch.insertMany(
            processedBranches.map((branch) => ({ coach: coachId, ...branch }))
        );

        if (req.body.about !== undefined) {
            await Coach.findByIdAndUpdate(coachId, { about: req.body.about });
        }

        res.status(200).json({
            success: true,
            message: 'Coach profile updated successfully',
            data: newBranches,
        });
    } catch (err) {
        next(err);
    }
};

export const getParticipantProfile = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate({
            path: 'participant',
            populate: [
                {
                    path: 'mainSport',
                    select: 'name groupName group',
                },
                {
                    path: 'sportGoal',
                    select: 'name',
                },
            ],
        });

        if (!user || !user.participant) {
            throw new AppError(404, 'User or participant profile not found');
        }

        const participant = user.participant;
        const mainSport = participant.mainSport;
        const sportGoal = participant.sportGoal;

        res.status(200).json({
            success: true,
            data: {
                participant: {
                    _id: participant._id,
                    mainSport: mainSport?._id || mainSport,
                    mainSportName: mainSport?.name || '',
                    mainSportGroup: mainSport?.group || '',
                    mainSportGroupName: mainSport?.groupName || '',
                    skillLevel: participant.skillLevel,
                    sportGoal: sportGoal?._id || participant.sportGoal,
                    sportGoalName: sportGoal?.name || '',
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

export const updateParticipantProfile = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId).populate('participant');

        if (!user || !user.participant) {
            throw new AppError(404, 'User or participant profile not found');
        }

        const result = zodValidation.editParticipantSchema.parse({
            mainSport: req.body?.mainSport,
            skillLevel: req.body?.skillLevel,
            sportGoal: req.body?.sportGoal,
        });

        const editParticipant = await Participant.findByIdAndUpdate(
            user.participant._id,
            { ...result },
            { new: true }
        );

        if (!editParticipant) throw new AppError(404);

        res.status(200).json({
            success: true,
            message: 'Participant profile updated successfully',
            data: editParticipant,
        });
    } catch (err) {
        next(err);
    }
};

export const updateFacilityProfile = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const facilityId = mongoObjectId.parse(req.params.facilityId);
        const user = await User.findById(userId);

        if (!user || !user.facility || !user.facility.some((f) => f.equals(facilityId))) {
            throw new AppError(404, 'User or facility not found');
        }

        const result = zodValidation.editFacilitySchema.parse(req.body);
        if (Object.keys(result).length === 0 && !req.fileMeta) {
            throw new AppError(400, 'At least one field must be provided.');
        }

        const facilityExists = await Facility.exists({ _id: facilityId });
        if (!facilityExists) throw new AppError(404, 'Facility not found');

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }

        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        }

        const updatedFacility = await Facility.findByIdAndUpdate(
            facilityId,
            { $set: result },
            { new: true }
        );

        res.status(200).json({
            success: true,
            message: 'Facility updated successfully',
            data: updatedFacility,
        });
    } catch (err) {
        next(err);
    }
};

// Static Pages Management
export const getAllStaticPages = async (req, res, next) => {
    try {
        const pages = await StaticPage.find()
            .sort({ order: 1, createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            data: pages,
        });
    } catch (err) {
        next(err);
    }
};

export const getStaticPageById = async (req, res, next) => {
    try {
        const pageId = zodValidation.mongoObjectId.parse(req.params.pageId);
        const page = await StaticPage.findById(pageId);

        if (!page) {
            throw new AppError(404, 'Page not found');
        }

        res.status(200).json({
            success: true,
            data: page,
        });
    } catch (err) {
        next(err);
    }
};

export const createStaticPage = async (req, res, next) => {
    try {
        const { name, title, content, isActive, order } = req.body;

        if (!name || !title || !content) {
            throw new AppError(400, 'Name, title, and content are required');
        }

        // Check if name already exists
        const existingPage = await StaticPage.findOne({ name });
        if (existingPage) {
            throw new AppError(409, 'Page with this name already exists');
        }

        const page = await StaticPage.create({
            name,
            title,
            content,
            isActive: isActive !== undefined ? isActive : true,
            order: order || 0,
        });

        res.status(201).json({
            success: true,
            message: 'Page created successfully',
            data: page,
        });
    } catch (err) {
        next(err);
    }
};

export const updateStaticPage = async (req, res, next) => {
    try {
        const pageId = zodValidation.mongoObjectId.parse(req.params.pageId);
        const { name, title, content, isActive, order } = req.body;

        const page = await StaticPage.findById(pageId);
        if (!page) {
            throw new AppError(404, 'Page not found');
        }

        // Check if name is being changed and if it conflicts
        if (name && name !== page.name) {
            const existingPage = await StaticPage.findOne({ name });
            if (existingPage) {
                throw new AppError(409, 'Page with this name already exists');
            }
        }

        if (name) page.name = name;
        if (title) page.title = title;
        if (content !== undefined) page.content = content;
        if (isActive !== undefined) page.isActive = isActive;
        if (order !== undefined) page.order = order;

        await page.save();

        res.status(200).json({
            success: true,
            message: 'Page updated successfully',
            data: page,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteStaticPage = async (req, res, next) => {
    try {
        const pageId = zodValidation.mongoObjectId.parse(req.params.pageId);
        const page = await StaticPage.findByIdAndDelete(pageId);

        if (!page) {
            throw new AppError(404, 'Page not found');
        }

        res.status(200).json({
            success: true,
            message: 'Page deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const getActiveStaticPages = async (req, res, next) => {
    try {
        const pages = await StaticPage.find({ isActive: true })
            .sort({ order: 1, createdAt: -1 })
            .select('name title')
            .lean();

        res.status(200).json({
            success: true,
            data: pages,
        });
    } catch (err) {
        next(err);
    }
};
