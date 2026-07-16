import mongoose from 'mongoose';
import { unlink } from 'fs/promises';
import User from '../models/userModel.js';
import AdminPermissionGroup from '../models/adminPermissionGroupModel.js';
import Coach from '../models/coachModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember from '../models/performanceMemberModel.js';
import Event from '../models/eventModel.js';
import Reservation from '../models/reservationModel.js';
import Participant from '../models/participantModel.js';
import Facility from '../models/facilityModel.js';
import Salon from '../models/salonModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import { Sport } from '../models/referenceDataModel.js';
import StaticPage from '../models/staticPageModel.js';
import Suggestion from '../models/suggestionModel.js';
import DashboardHeroSlide from '../models/dashboardHeroSlideModel.js';
import DashboardHeroClick from '../models/dashboardHeroClickModel.js';
import DashboardHeaderLogo, { HEADER_LOGO_KEY } from '../models/dashboardHeaderLogoModel.js';
import { parseHeroAnalyticsQuery, fillDailySeries } from '../utils/heroClickAnalytics.js';
import { parseHeroContext, buildHeroContextFilter } from '../utils/heroContext.js';
import { AppError } from '../utils/appError.js';
import {
    SearchQuerySchema,
    mongoObjectId,
    adminCreateUserSchema,
    adminEditUserSchema,
} from '../utils/validation.js';
import * as zodValidation from '../utils/validation.js';
import argon2 from 'argon2';
import { checkPasswordStrength } from '../utils/passwordStrength.js';
import { notifyCertificateApproved, notifyCertificateRejected } from '../utils/notificationHelper.js';
import { uploadsRelativePath } from '../utils/eventEndPhotoHelper.js';
import { isValidHeroCtaHref } from '../utils/heroCtaHref.js';
import { mergeLocationIntoPayload } from '../utils/entityLocation.js';
import { ADMIN_PERMISSION_STAR } from '../constants/adminPermissions.js';

export const getAdminPanel = async (req, res, next) => {
    try {
        const permissions = req.adminPermissions ? Array.from(req.adminPermissions) : [];
        const isFullAdmin = req.adminPermissions?.has(ADMIN_PERMISSION_STAR) ?? false;
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
                permissions,
                isFullAdmin,
            },
        });
    } catch (err) {
        next(err);
    }
};

// User Management
export const getAllUsers = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search, profileType, performanceBranch } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
            profileType: req.body?.profileType || req.query?.profileType,
            performanceBranch: req.body?.performanceBranch || req.query?.performanceBranch,
        });

        const query = {};
        const trimmedSearch = search?.trim() || '';

        const textOr = trimmedSearch
            ? [
                  { firstName: { $regex: trimmedSearch, $options: 'i' } },
                  { lastName: { $regex: trimmedSearch, $options: 'i' } },
                  { email: { $regex: trimmedSearch, $options: 'i' } },
                  { phone: { $regex: trimmedSearch, $options: 'i' } },
              ]
            : [];

        const idOr = [];
        if (
            trimmedSearch &&
            /^[a-fA-F0-9]{24}$/.test(trimmedSearch) &&
            mongoose.Types.ObjectId.isValid(trimmedSearch)
        ) {
            idOr.push(
                { _id: trimmedSearch },
                { participant: trimmedSearch },
                { coach: trimmedSearch },
                { performanceMember: trimmedSearch },
                { facility: trimmedSearch },
                { company: trimmedSearch }
            );
        }

        if (textOr.length || idOr.length) {
            query.$or = [...textOr, ...idOr];
        }

        if (profileType === 'participant') {
            query.participant = { $exists: true, $ne: null };
        } else if (profileType === 'coach') {
            query.coach = { $exists: true, $ne: null };
        } else if (profileType === 'facility') {
            query.facility = { $exists: true, $ne: null, $not: { $size: 0 } };
        } else if (profileType === 'performance') {
            if (performanceBranch) {
                const performanceIds = await PerformanceMember.find({ branch: performanceBranch })
                    .select('_id')
                    .lean();
                query.performanceMember = {
                    $in: performanceIds.map((row) => row._id),
                };
            } else {
                query.performanceMember = { $exists: true, $ne: null };
            }
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
            .populate('performanceMember', 'name branch title status isVerified')
            .populate('facility', 'name mainSport')
            .populate('termsAccepted.versionId', 'docType version title isActive')
            .populate('kvkkConsent.versionId', 'docType version title isActive')
            .populate({ path: 'adminPermissionGroups', select: 'name slug permissions' })
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
                    }).populate('sport', 'name groupName icon coachBadge').lean();
                    
                    const approvedBranchesCount = approvedBranches.length;
                    const sports = approvedBranches.map((branch) => ({
                        name: branch.sport?.name || 'Unknown',
                        groupName: branch.sport?.groupName || '',
                    }));
                    
                    /** All events this user created (any start date; includes cancelled). */
                    const eventsCount = await Event.countDocuments({
                        owner: user._id,
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
                    const salonsWithSport = await Salon.find({
                        facility: { $in: facilityIds },
                    })
                        .select('sport')
                        .populate('sport', 'name')
                        .lean();
                    const sportCounts = new Map();
                    for (const s of salonsWithSport) {
                        const name =
                            s.sport && typeof s.sport === 'object' && s.sport.name
                                ? s.sport.name
                                : 'Unknown';
                        sportCounts.set(name, (sportCounts.get(name) || 0) + 1);
                    }
                    const salonSportsSummary = [...sportCounts.entries()]
                        .map(([name, count]) => ({ name, count }))
                        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
                    summary.facility = {
                        facilityCount: user.facility.length,
                        salonsCount,
                        salonSportsSummary,
                        salonSportsLabel: salonSportsSummary
                            .map(({ name, count }) => `${name}: ${count}`)
                            .join(', '),
                    };
                }

                if (user.performanceMember) {
                    const profile =
                        typeof user.performanceMember === 'object' ? user.performanceMember : null;
                    if (profile) {
                        summary.performance = {
                            branch: profile.branch,
                            status: profile.status,
                            isVerified: profile.isVerified,
                            title: profile.title || '',
                        };
                    }
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

/**
 * Leaderboard for most active participants, coaches, facilities, and groups by joined participation count.
 */
export const getUserActivityLeaderboard = async (req, res, next) => {
    try {
        const rawLimit = Number(req.query?.limit ?? req.body?.limit ?? 10);
        const limit = Number.isFinite(rawLimit)
            ? Math.max(1, Math.min(100, Math.trunc(rawLimit)))
            : 10;

        const participantLeaderboard = await Reservation.aggregate([
            { $match: { isJoined: true, participant: { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$participant',
                    totalParticipations: { $sum: 1 },
                    lastParticipationAt: { $max: '$updatedAt' },
                },
            },
            { $sort: { totalParticipations: -1, lastParticipationAt: -1 } },
            { $limit: limit },
            {
                $lookup: {
                    from: 'participants',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'participant',
                },
            },
            { $unwind: '$participant' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'participant._id',
                    foreignField: 'participant',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 0,
                    participantId: '$participant._id',
                    userId: '$user._id',
                    firstName: '$user.firstName',
                    lastName: '$user.lastName',
                    email: '$user.email',
                    totalParticipations: 1,
                    lastParticipationAt: 1,
                },
            },
        ]);

        const coachLeaderboard = await Reservation.aggregate([
            { $match: { isJoined: true, event: { $exists: true, $ne: null } } },
            {
                $lookup: {
                    from: 'events',
                    localField: 'event',
                    foreignField: '_id',
                    as: 'event',
                },
            },
            { $unwind: '$event' },
            { $match: { 'event.owner': { $exists: true, $ne: null } } },
            {
                $group: {
                    _id: '$event.owner',
                    totalParticipations: { $sum: 1 },
                    eventIds: { $addToSet: '$event._id' },
                    lastParticipationAt: { $max: '$updatedAt' },
                },
            },
            {
                $addFields: {
                    eventCount: { $size: '$eventIds' },
                },
            },
            { $sort: { totalParticipations: -1, eventCount: -1, lastParticipationAt: -1 } },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user',
                },
            },
            { $unwind: '$user' },
            { $match: { 'user.coach': { $exists: true, $ne: null } } },
            {
                $lookup: {
                    from: 'coaches',
                    localField: 'user.coach',
                    foreignField: '_id',
                    as: 'coach',
                },
            },
            { $unwind: { path: '$coach', preserveNullAndEmptyArrays: true } },
            { $limit: limit },
            {
                $project: {
                    _id: 0,
                    coachUserId: '$user._id',
                    coachId: '$user.coach',
                    coachName: '$coach.name',
                    firstName: '$user.firstName',
                    lastName: '$user.lastName',
                    email: '$user.email',
                    totalParticipations: 1,
                    eventCount: 1,
                    lastParticipationAt: 1,
                },
            },
        ]);

        const buildVenueLeaderboard = (matchField) =>
            Reservation.aggregate([
                { $match: { isJoined: true, event: { $exists: true, $ne: null } } },
                {
                    $lookup: {
                        from: 'events',
                        localField: 'event',
                        foreignField: '_id',
                        as: 'event',
                    },
                },
                { $unwind: '$event' },
                { $match: { [`event.${matchField}`]: { $exists: true, $ne: null } } },
                {
                    $group: {
                        _id: `$event.${matchField}`,
                        totalParticipations: { $sum: 1 },
                        eventIds: { $addToSet: '$event._id' },
                        lastParticipationAt: { $max: '$updatedAt' },
                    },
                },
                {
                    $addFields: {
                        eventCount: { $size: '$eventIds' },
                    },
                },
                { $sort: { totalParticipations: -1, eventCount: -1, lastParticipationAt: -1 } },
                { $limit: limit },
            ]);

        const [facilityAgg, groupAgg] = await Promise.all([
            buildVenueLeaderboard('facility'),
            buildVenueLeaderboard('group'),
        ]);

        const facilityIds = facilityAgg.map((row) => row._id);
        const groupIds = groupAgg.map((row) => row._id);

        const [facilities, groups] = await Promise.all([
            facilityIds.length
                ? Facility.find({ _id: { $in: facilityIds } })
                      .select('name')
                      .lean()
                : [],
            groupIds.length
                ? ClubGroup.find({ _id: { $in: groupIds } })
                      .select('name clubName')
                      .lean()
                : [],
        ]);

        const facilityById = new Map(facilities.map((f) => [String(f._id), f]));
        const groupById = new Map(groups.map((g) => [String(g._id), g]));

        const facilityLeaderboard = facilityAgg.map((row) => {
            const facility = facilityById.get(String(row._id));
            return {
                facilityId: row._id,
                facilityName: facility?.name || 'Unknown facility',
                totalParticipations: row.totalParticipations,
                eventCount: row.eventCount,
                lastParticipationAt: row.lastParticipationAt,
            };
        });

        const groupLeaderboard = groupAgg.map((row) => {
            const group = groupById.get(String(row._id));
            return {
                groupId: row._id,
                groupName: group?.name || 'Unknown group',
                clubName: group?.clubName || '',
                totalParticipations: row.totalParticipations,
                eventCount: row.eventCount,
                lastParticipationAt: row.lastParticipationAt,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                topParticipant: participantLeaderboard[0] || null,
                topCoach: coachLeaderboard[0] || null,
                topFacility: facilityLeaderboard[0] || null,
                topGroup: groupLeaderboard[0] || null,
                participantLeaderboard,
                coachLeaderboard,
                facilityLeaderboard,
                groupLeaderboard,
                limit,
            },
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
        const { password, adminPermissionGroups, ...userData } = result;

        let groupIds = [];
        if (userData.role === 0 && adminPermissionGroups?.length) {
            if (!req.adminPermissions?.has(ADMIN_PERMISSION_STAR)) {
                throw new AppError(403, 'Yalnızca tam yetkili yönetici izin grubu atayabilir.');
            }
            const n = await AdminPermissionGroup.countDocuments({ _id: { $in: adminPermissionGroups } });
            if (n !== adminPermissionGroups.length) {
                throw new AppError(400, 'Geçersiz izin grubu');
            }
            groupIds = adminPermissionGroups;
        }

        const user = await User.create({
            ...userData,
            password: hashedPassword,
            termsAccepted: null,
            kvkkConsent: null,
            adminPermissionGroups: groupIds,
        });

        await user.populate({ path: 'adminPermissionGroups', select: 'name slug permissions' });

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

        const result = adminEditUserSchema.parse(updateData);

        const targetBefore = await User.findById(userId).select('role');
        if (!targetBefore) {
            throw new AppError(404, 'User not found');
        }
        const finalRole = result.role !== undefined ? result.role : targetBefore.role;
        if (finalRole !== 0) {
            delete result.adminPermissionGroups;
        }

        const hasFull = req.adminPermissions?.has(ADMIN_PERMISSION_STAR);

        if (result.isActive === false && userId.toString() === req.user._id.toString()) {
            throw new AppError(400, 'Kendi hesabınızı pasifleştiremezsiniz.');
        }

        if (result.adminPermissionGroups !== undefined && !hasFull) {
            throw new AppError(403, 'İzin grubu ataması için tam yetki gerekir.');
        }

        if (result.role === 1) {
            result.adminPermissionGroups = [];
        } else if (result.role === 0 && result.adminPermissionGroups !== undefined && hasFull) {
            const ids = result.adminPermissionGroups;
            if (ids.length) {
                const n = await AdminPermissionGroup.countDocuments({ _id: { $in: ids } });
                if (n !== ids.length) {
                    throw new AppError(400, 'Geçersiz izin grubu');
                }
            }
        }

        if (passwordHash) {
            result.password = passwordHash;
        }

        const patch = Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));

        const updatedUser = await User.findByIdAndUpdate(userId, { $set: patch }, { new: true })
            .select('-password -failedLoginAttempts -accountLockedUntil')
            .populate({ path: 'adminPermissionGroups', select: 'name slug permissions' });

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

        const statusParam = String(req.body?.status || req.query?.status || 'Pending').trim();
        const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
        const status = allowedStatuses.includes(statusParam) ? statusParam : 'Pending';

        const branches = await Branch.find({ status })
            .populate({
                path: 'coach',
                select: 'name isVerified',
            })
            .populate('sport', 'name groupName icon coachBadge')
            .sort({ createdAt: -1 })
            .lean();

        let filteredBranches = branches;

        if (search) {
            const trimmed = search.trim();
            const oidMatch =
                /^[a-fA-F0-9]{24}$/.test(trimmed) &&
                mongoose.Types.ObjectId.isValid(trimmed);

            if (oidMatch) {
                filteredBranches = branches.filter(
                    (branch) =>
                        String(branch._id) === trimmed ||
                        String(branch.coach?._id) === trimmed
                );
            } else {
                const searchLower = trimmed.toLowerCase();
                filteredBranches = branches.filter((branch) => {
                    const coachName = branch.coach?.name || '';
                    const sportName = branch.sport?.name || '';
                    return (
                        coachName.toLowerCase().includes(searchLower) ||
                        sportName.toLowerCase().includes(searchLower)
                    );
                });
            }
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
            status,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const getPerformanceApplications = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
        });

        const statusParam = String(req.body?.status || req.query?.status || 'Pending').trim();
        const allowedStatuses = ['Pending', 'Approved', 'Rejected'];
        const status = allowedStatuses.includes(statusParam) ? statusParam : 'Pending';

        const applications = await PerformanceMember.find({ status })
            .populate('user', 'firstName lastName email phone photo')
            .sort({ createdAt: -1 })
            .lean();

        let filteredApplications = applications;
        if (search) {
            const trimmed = search.trim();
            const oidMatch =
                /^[a-fA-F0-9]{24}$/.test(trimmed) &&
                mongoose.Types.ObjectId.isValid(trimmed);

            if (oidMatch) {
                filteredApplications = applications.filter(
                    (item) => String(item._id) === trimmed || String(item.user?._id) === trimmed
                );
            } else {
                const searchLower = trimmed.toLowerCase();
                filteredApplications = applications.filter((item) => {
                    const userName = `${item.user?.firstName || ''} ${item.user?.lastName || ''}`;
                    return (
                        item.name?.toLowerCase().includes(searchLower) ||
                        userName.toLowerCase().includes(searchLower) ||
                        item.user?.email?.toLowerCase().includes(searchLower) ||
                        item.branch?.toLowerCase().includes(searchLower)
                    );
                });
            }
        }

        const total = filteredApplications.length;
        const data = filteredApplications.slice((pageNumber - 1) * perPage, pageNumber * perPage);

        res.status(200).json({
            success: true,
            data,
            total,
            status,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage),
        });
    } catch (err) {
        next(err);
    }
};

export const approvePerformanceApplication = async (req, res, next) => {
    try {
        const applicationId = mongoObjectId.parse(req.params.applicationId);

        const application = await PerformanceMember.findByIdAndUpdate(
            applicationId,
            { status: 'Approved', isVerified: true, rejectionReason: '' },
            { new: true }
        ).populate('user', 'firstName lastName email phone photo');

        if (!application) {
            throw new AppError(404, 'Performance application not found');
        }

        await User.findByIdAndUpdate(application.user._id ?? application.user, {
            performanceMember: application._id,
        });

        res.status(200).json({
            success: true,
            message: 'Performance Team application approved successfully',
            data: application,
        });
    } catch (err) {
        next(err);
    }
};

export const rejectPerformanceApplication = async (req, res, next) => {
    try {
        const applicationId = mongoObjectId.parse(req.params.applicationId);

        const application = await PerformanceMember.findByIdAndUpdate(
            applicationId,
            {
                status: 'Rejected',
                isVerified: false,
                rejectionReason: String(req.body?.reason || '').trim(),
            },
            { new: true }
        ).populate('user', 'firstName lastName email phone photo');

        if (!application) {
            throw new AppError(404, 'Performance application not found');
        }

        res.status(200).json({
            success: true,
            message: 'Performance Team application rejected successfully',
            data: application,
        });
    } catch (err) {
        next(err);
    }
};

async function deleteBranchCertificateFile(branch) {
    if (!branch?.certificate?.path) return;
    try {
        await unlink(branch.certificate.path);
    } catch (err) {
        console.warn(`Failed to delete certificate file: ${branch.certificate.path}`, err);
    }
}

/**
 * If the coach has no approved branches, remove coach profile so the user stays a gamer only.
 */
async function revertCoachApplicationIfNotApproved(coachId) {
    const coachObjectId = coachId?._id ?? coachId;
    const approvedCount = await Branch.countDocuments({
        coach: coachObjectId,
        status: 'Approved',
    });

    if (approvedCount > 0) {
        const allBranches = await Branch.find({ coach: coachObjectId });
        const allApproved =
            allBranches.length > 0 &&
            allBranches.every((b) => b.status === 'Approved');
        await Coach.findByIdAndUpdate(coachObjectId, { isVerified: !!allApproved });
        return { reverted: false };
    }

    const branches = await Branch.find({ coach: coachObjectId });
    for (const b of branches) {
        await deleteBranchCertificateFile(b);
    }
    await Branch.deleteMany({ coach: coachObjectId });
    await User.updateMany({ coach: coachObjectId }, { $set: { coach: null } });
    await Coach.findByIdAndDelete(coachObjectId);
    return { reverted: true };
}

export const approveCertificate = async (req, res, next) => {
    try {
        const branchId = mongoObjectId.parse(req.params.branchId);

        const branch = await Branch.findByIdAndUpdate(
            branchId,
            { status: 'Approved' },
            { new: true }
        )
            .populate('coach')
            .populate('sport', 'name icon coachBadge');

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
            .populate('sport', 'name icon coachBadge');

        if (!branch) {
            throw new AppError(404, 'Branch not found');
        }

        const coachId = branch.coach._id ?? branch.coach;

        const user = await User.findOne({ coach: coachId });
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
            }
        }

        const { reverted } = await revertCoachApplicationIfNotApproved(coachId);

        res.status(200).json({
            success: true,
            message: reverted
                ? 'Certificate rejected. User remains a gamer; coach application was removed.'
                : 'Certificate rejected successfully',
            data: branch,
            revertedToGamer: reverted,
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
            .populate('sport', 'name groupName icon coachBadge')
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
            throw new AppError(404, 'User or gamer profile not found');
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
            .populate('sport', 'name groupName icon coachBadge')
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
                select: 'name groupName icon coachBadge',
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

        const { branches: result } = zodValidation.parseCoachProfileFormData(req.body.data);

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
            throw new AppError(404, 'User or gamer profile not found');
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
            throw new AppError(404, 'User or gamer profile not found');
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
            message: 'Gamer profile updated successfully',
            data: editParticipant,
        });
    } catch (err) {
        next(err);
    }
};

export const createFacilityForUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const user = await User.findById(userId);
        if (!user) throw new AppError(404, 'User not found');

        const data =
            typeof req.body?.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const result = zodValidation.createFacilitySchema.parse(data);

        const sportExists = await Sport.exists({ _id: result.mainSport });
        if (!sportExists) throw new AppError(404, 'MainSport not found');

        if (req.fileMeta) {
            result.photo = {
                path: req.fileMeta.path,
                originalName: req.fileMeta.originalName,
                mimeType: req.fileMeta.mimeType,
                size: req.fileMeta.size,
            };
        }

        const facilityPayload = await mergeLocationIntoPayload(result);
        const newFacility = await Facility.create(facilityPayload);

        await User.findByIdAndUpdate(userId, {
            $push: { facility: newFacility._id },
        });

        res.status(201).json({
            success: true,
            message: 'Facility created successfully',
            data: newFacility,
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

        const raw =
            typeof req.body?.data === 'string' ? JSON.parse(req.body.data) : req.body;
        const result = zodValidation.editFacilitySchema.parse(raw);
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

        const updatePayload = await mergeLocationIntoPayload(result);
        const updatedFacility = await Facility.findByIdAndUpdate(
            facilityId,
            { $set: updatePayload },
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

export const listSuggestions = async (req, res, next) => {
    try {
        const list = await Suggestion.find()
            .sort({ createdAt: -1 })
            .limit(400)
            .select('message email contactName createdAt')
            .lean();

        res.status(200).json({
            success: true,
            data: list,
        });
    } catch (err) {
        next(err);
    }
};

function parseDashboardHeroData(req) {
    try {
        if (typeof req.body?.data === 'string') {
            return JSON.parse(req.body.data);
        }
    } catch {
        throw new AppError(400, 'Invalid JSON in data field');
    }
    if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        return req.body;
    }
    return {};
}

async function safeUnlinkHeroImage(image) {
    if (!image?.path) return;
    try {
        await unlink(image.path);
    } catch {
        /* ignore */
    }
}

function sanitizeDashboardHeroPayload(body, { partial } = { partial: false }) {
    const out = {};
    if (!partial || body.badgeLabel !== undefined) {
        out.badgeLabel =
            typeof body.badgeLabel === 'string' ? body.badgeLabel.trim().slice(0, 80) : '';
    }
    if (!partial || body.title !== undefined) {
        const t = typeof body.title === 'string' ? body.title.trim() : '';
        out.title = t.slice(0, 220);
    }
    if (!partial || body.subtitle !== undefined) {
        out.subtitle =
            typeof body.subtitle === 'string' ? body.subtitle.trim().slice(0, 600) : '';
    }
    if (!partial || body.imageAlt !== undefined) {
        out.imageAlt =
            typeof body.imageAlt === 'string' ? body.imageAlt.trim().slice(0, 200) : '';
    }
    if (!partial || body.ctaLabel !== undefined) {
        out.ctaLabel =
            typeof body.ctaLabel === 'string' ? body.ctaLabel.trim().slice(0, 80) : '';
    }
    if (!partial || body.ctaHref !== undefined) {
        const h = typeof body.ctaHref === 'string' ? body.ctaHref.trim() : '';
        if (h && !isValidHeroCtaHref(h)) {
            throw new AppError(
                400,
                'CTA link must be a site path (e.g. /events) or https:// URL'
            );
        }
        out.ctaHref = h.slice(0, 500);
    }
    if (!partial || body.ctaRequiresAdminRole !== undefined) {
        out.ctaRequiresAdminRole = !!body.ctaRequiresAdminRole;
    }
    if (!partial || body.isActive !== undefined) {
        out.isActive = body.isActive !== false;
    }
    if (!partial || body.order !== undefined) {
        const o = Number(body.order);
        out.order = Number.isFinite(o) ? o : 0;
    }
    if (!partial || body.context !== undefined) {
        out.context = parseHeroContext(body.context);
    }
    return out;
}

export const listDashboardHeroSlides = async (req, res, next) => {
    try {
        const context = parseHeroContext(req.query?.context);
        const rows = await DashboardHeroSlide.find(buildHeroContextFilter(context))
            .sort({ order: 1, createdAt: -1 })
            .lean();

        const data = rows.map((row) => ({
            ...row,
            image: row.image?.path
                ? {
                      ...row.image,
                      path: uploadsRelativePath(row.image.path),
                  }
                : undefined,
        }));

        res.status(200).json({ success: true, data });
    } catch (err) {
        next(err);
    }
};

export const createDashboardHeroSlide = async (req, res, next) => {
    try {
        const raw = parseDashboardHeroData(req);
        const payload = sanitizeDashboardHeroPayload(raw, { partial: false });
        if (!payload.context) {
            payload.context = parseHeroContext(raw.context);
        }
        if (req.fileMeta) {
            payload.image = req.fileMeta;
        }
        if (
            !heroSlideHasContent({
                title: payload.title,
                subtitle: payload.subtitle,
                image: payload.image,
            })
        ) {
            throw new AppError(
                400,
                'Add at least an image, a title, or a subtitle'
            );
        }
        const slide = await DashboardHeroSlide.create(payload);
        res.status(201).json({ success: true, data: slide });
    } catch (err) {
        next(err);
    }
};

export const updateDashboardHeroSlide = async (req, res, next) => {
    try {
        const slideId = zodValidation.mongoObjectId.parse(req.params.slideId);
        const slide = await DashboardHeroSlide.findById(slideId);
        if (!slide) throw new AppError(404, 'Slide not found');

        const raw = parseDashboardHeroData(req);
        const payload = sanitizeDashboardHeroPayload(raw, { partial: true });
        Object.assign(slide, payload);

        if (raw.removeImage === true) {
            await safeUnlinkHeroImage(slide.image);
            slide.image = undefined;
        }

        if (req.fileMeta) {
            await safeUnlinkHeroImage(slide.image);
            slide.image = req.fileMeta;
        }

        if (
            !heroSlideHasContent({
                title: slide.title,
                subtitle: slide.subtitle,
                image: slide.image,
            })
        ) {
            throw new AppError(
                400,
                'Slide must keep at least an image, a title, or a subtitle'
            );
        }

        await slide.save();

        res.status(200).json({ success: true, data: slide });
    } catch (err) {
        next(err);
    }
};

export const getDashboardHeroAnalytics = async (req, res, next) => {
    try {
        const context = parseHeroContext(req.query?.context);
        const { from, to, days, slideId } = parseHeroAnalyticsQuery(req.query);

        const contextSlides = await DashboardHeroSlide.find(buildHeroContextFilter(context))
            .select('_id')
            .lean();
        const contextSlideIds = contextSlides.map((s) => s._id);

        const match = {
            clickedAt: { $gte: from, $lte: to },
            slideId: { $in: contextSlideIds },
            ...(slideId ? { slideId: new mongoose.Types.ObjectId(slideId) } : {}),
        };

        const [periodBySlide, dailyRows, dailyBySlideRows, loggedInCount, slides] =
            await Promise.all([
                DashboardHeroClick.aggregate([
                    { $match: match },
                    { $group: { _id: '$slideId', periodClicks: { $sum: 1 } } },
                    { $sort: { periodClicks: -1 } },
                ]),
                DashboardHeroClick.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: {
                                $dateToString: {
                                    format: '%Y-%m-%d',
                                    date: '$clickedAt',
                                    timezone: 'UTC',
                                },
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ]),
                DashboardHeroClick.aggregate([
                    { $match: match },
                    {
                        $group: {
                            _id: {
                                day: {
                                    $dateToString: {
                                        format: '%Y-%m-%d',
                                        date: '$clickedAt',
                                        timezone: 'UTC',
                                    },
                                },
                                slideId: '$slideId',
                            },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { '_id.day': 1 } },
                ]),
                DashboardHeroClick.countDocuments({
                    ...match,
                    userId: { $ne: null },
                }),
                DashboardHeroSlide.find(buildHeroContextFilter(context))
                    .select('title badgeLabel ctaHref isActive order clickCount lastClickedAt')
                    .sort({ order: 1, createdAt: -1 })
                    .lean(),
            ]);

        const slideMap = new Map(slides.map((s) => [String(s._id), s]));
        const periodMap = new Map(
            periodBySlide.map((r) => [String(r._id), r.periodClicks])
        );

        const periodClicksTotal = periodBySlide.reduce((n, r) => n + r.periodClicks, 0);

        const bySlide = slides.map((s) => {
            const id = String(s._id);
            return {
                slideId: id,
                title: s.title || s.badgeLabel || '(untitled)',
                ctaHref: s.ctaHref || '',
                isActive: s.isActive !== false,
                allTimeClicks: s.clickCount ?? 0,
                periodClicks: periodMap.get(id) ?? 0,
                lastClickedAt: s.lastClickedAt ?? null,
            };
        });

        for (const row of periodBySlide) {
            const id = String(row._id);
            if (!slideMap.has(id)) {
                bySlide.push({
                    slideId: id,
                    title: '(deleted slide)',
                    ctaHref: '',
                    isActive: false,
                    allTimeClicks: 0,
                    periodClicks: row.periodClicks,
                    lastClickedAt: null,
                });
            }
        }

        bySlide.sort((a, b) => b.periodClicks - a.periodClicks);

        const daily = fillDailySeries(
            from,
            to,
            dailyRows.map((r) => ({ date: r._id, count: r.count }))
        );

        const dailyBySlide = dailyBySlideRows.map((r) => {
            const sid = String(r._id.slideId);
            const slide = slideMap.get(sid);
            return {
                date: r._id.day,
                slideId: sid,
                slideTitle: slide?.title || slide?.badgeLabel || '(deleted slide)',
                count: r.count,
            };
        });

        res.status(200).json({
            success: true,
            data: {
                range: {
                    from: from.toISOString(),
                    to: to.toISOString(),
                    days,
                    slideId,
                },
                summary: {
                    periodClicks: periodClicksTotal,
                    loggedInClicks: loggedInCount,
                },
                daily,
                dailyBySlide,
                bySlide,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDashboardHeroSlide = async (req, res, next) => {
    try {
        const slideId = zodValidation.mongoObjectId.parse(req.params.slideId);
        const slide = await DashboardHeroSlide.findById(slideId);
        if (!slide) throw new AppError(404, 'Slide not found');
        await safeUnlinkHeroImage(slide.image);
        await slide.deleteOne();

        res.status(200).json({ success: true, message: 'Slide deleted' });
    } catch (err) {
        next(err);
    }
};

function heroSlideHasContent({ title, subtitle, image }) {
    return !!(image?.path || String(title || '').trim() || String(subtitle || '').trim());
}

function formatDashboardHeaderLogo(row) {
    if (!row) return null;
    return {
        _id: row._id,
        imageAlt: row.imageAlt || '',
        isActive: row.isActive !== false,
        image: row.image?.path
            ? {
                  ...row.image,
                  path: uploadsRelativePath(row.image.path),
              }
            : undefined,
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : null,
    };
}

export const getDashboardHeaderLogo = async (req, res, next) => {
    try {
        const row = await DashboardHeaderLogo.findOne({ key: HEADER_LOGO_KEY }).lean();
        res.status(200).json({
            success: true,
            data: formatDashboardHeaderLogo(row),
        });
    } catch (err) {
        next(err);
    }
};

export const updateDashboardHeaderLogo = async (req, res, next) => {
    try {
        const raw = parseDashboardHeroData(req);
        const body = raw && typeof raw === 'object' ? raw : {};

        let logo = await DashboardHeaderLogo.findOne({ key: HEADER_LOGO_KEY });
        if (!logo) {
            logo = new DashboardHeaderLogo({ key: HEADER_LOGO_KEY });
        }

        if (body.imageAlt !== undefined) {
            logo.imageAlt =
                typeof body.imageAlt === 'string'
                    ? body.imageAlt.trim().slice(0, 120)
                    : 'EventSport';
        }
        if (body.isActive !== undefined) {
            logo.isActive = body.isActive !== false;
        }
        const removingImage = !!body.removeImage && !req.fileMeta;

        if (body.removeImage) {
            await safeUnlinkHeroImage(logo.image);
            logo.image = undefined;
        }
        if (req.fileMeta) {
            await safeUnlinkHeroImage(logo.image);
            logo.image = req.fileMeta;
        }

        if (!logo.image?.path && !req.fileMeta) {
            if (removingImage || logo.isNew) {
                if (!logo.isNew) {
                    await logo.deleteOne();
                }
                return res.status(200).json({ success: true, data: null });
            }
            throw new AppError(400, 'Upload a logo image');
        }

        await logo.save();

        res.status(200).json({
            success: true,
            data: formatDashboardHeaderLogo(logo.toObject()),
        });
    } catch (err) {
        next(err);
    }
};

export const deleteDashboardHeaderLogo = async (req, res, next) => {
    try {
        const logo = await DashboardHeaderLogo.findOne({ key: HEADER_LOGO_KEY });
        if (!logo) {
            return res.status(200).json({ success: true, data: null });
        }
        await safeUnlinkHeroImage(logo.image);
        await logo.deleteOne();
        res.status(200).json({
            success: true,
            data: null,
            message: 'Logo removed',
        });
    } catch (err) {
        next(err);
    }
};
