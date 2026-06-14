import mongoose from 'mongoose';
import Report from '../models/reportModel.js';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Event from '../models/eventModel.js';
import Facility from '../models/facilityModel.js';
import Company from '../models/companyModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import { AppError } from '../utils/appError.js';
import {
    submitReportSchema,
    adminListReportsSchema,
    resolveReportSchema,
    mongoObjectId,
} from '../utils/validation.js';

const MAX_REPORTS_PER_DAY = 10;
const OPEN_STATUSES = ['open'];

async function assertTargetExists(targetType, targetId) {
    if (targetType === 'event') {
        const exists = await Event.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Event not found.');
        return;
    }
    if (targetType === 'user') {
        const exists = await User.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'User not found.');
        return;
    }
    if (targetType === 'coach') {
        const exists = await Coach.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Coach not found.');
        return;
    }
    if (targetType === 'facility') {
        const exists = await Facility.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Facility not found.');
        return;
    }
    if (targetType === 'company') {
        const exists = await Company.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Company not found.');
        return;
    }
    if (targetType === 'club') {
        const exists = await Club.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Club not found.');
        return;
    }
    if (targetType === 'community') {
        const exists = await ClubGroup.exists({ _id: targetId });
        if (!exists) throw new AppError(404, 'Community not found.');
    }
}

async function assertNotSelfReport(reporterId, targetType, targetId) {
    const reporterStr = reporterId.toString();
    if (targetType === 'user' && targetId.toString() === reporterStr) {
        throw new AppError(400, 'You cannot report yourself.');
    }
    if (targetType === 'coach') {
        const owner = await User.findOne({ coach: targetId }).select('_id').lean();
        if (owner && owner._id.toString() === reporterStr) {
            throw new AppError(400, 'You cannot report your own profile.');
        }
    }
    if (targetType === 'event') {
        const event = await Event.findById(targetId).select('owner').lean();
        if (event?.owner?.toString() === reporterStr) {
            throw new AppError(400, 'You cannot report your own event.');
        }
    }
    if (targetType === 'facility') {
        const owner = await User.findOne({ facility: targetId }).select('_id').lean();
        if (owner && owner._id.toString() === reporterStr) {
            throw new AppError(400, 'You cannot report your own facility.');
        }
    }
    if (targetType === 'company') {
        const owner = await User.findOne({ company: targetId }).select('_id').lean();
        if (owner && owner._id.toString() === reporterStr) {
            throw new AppError(400, 'You cannot report your own company.');
        }
    }
    if (targetType === 'club') {
        const club = await Club.findById(targetId).select('creator').lean();
        if (club?.creator?.toString() === reporterStr) {
            throw new AppError(400, 'You cannot report your own club.');
        }
    }
    if (targetType === 'community') {
        const group = await ClubGroup.findById(targetId).select('owner').lean();
        if (group?.owner) {
            const owner = await User.findOne({ coach: group.owner }).select('_id').lean();
            if (owner && owner._id.toString() === reporterStr) {
                throw new AppError(400, 'You cannot report your own community.');
            }
        }
    }
}

async function resolveUserIdForTarget(targetType, targetId) {
    if (targetType === 'user') return targetId;
    if (targetType === 'coach') {
        const user = await User.findOne({ coach: targetId }).select('_id').lean();
        return user?._id || null;
    }
    if (targetType === 'event') {
        const event = await Event.findById(targetId).select('owner').lean();
        return event?.owner || null;
    }
    if (targetType === 'facility') {
        const user = await User.findOne({ facility: targetId }).select('_id').lean();
        return user?._id || null;
    }
    if (targetType === 'company') {
        const user = await User.findOne({ company: targetId }).select('_id').lean();
        return user?._id || null;
    }
    if (targetType === 'club') {
        const club = await Club.findById(targetId).select('creator').lean();
        return club?.creator || null;
    }
    if (targetType === 'community') {
        const group = await ClubGroup.findById(targetId).select('owner').lean();
        if (!group?.owner) return null;
        const user = await User.findOne({ coach: group.owner }).select('_id').lean();
        return user?._id || null;
    }
    return null;
}

async function enrichReports(rows) {
    const eventIds = [];
    const userIds = [];
    const coachIds = [];
    const facilityIds = [];
    const companyIds = [];
    const clubIds = [];
    const communityIds = [];

    for (const row of rows) {
        if (row.targetType === 'event') eventIds.push(row.targetId);
        else if (row.targetType === 'user') userIds.push(row.targetId);
        else if (row.targetType === 'coach') coachIds.push(row.targetId);
        else if (row.targetType === 'facility') facilityIds.push(row.targetId);
        else if (row.targetType === 'company') companyIds.push(row.targetId);
        else if (row.targetType === 'club') clubIds.push(row.targetId);
        else if (row.targetType === 'community') communityIds.push(row.targetId);
    }

    const [events, users, coaches, coachUsers, facilities, companies, clubs, communities] =
        await Promise.all([
        eventIds.length
            ? Event.find({ _id: { $in: eventIds } })
                  .select('name status owner startTime')
                  .populate({ path: 'owner', select: 'firstName lastName email' })
                  .lean()
            : [],
        userIds.length
            ? User.find({ _id: { $in: userIds } })
                  .select('firstName lastName email photo coach')
                  .lean()
            : [],
        coachIds.length ? Coach.find({ _id: { $in: coachIds } }).select('name isVerified').lean() : [],
        coachIds.length
            ? User.find({ coach: { $in: coachIds } })
                  .select('firstName lastName email photo coach')
                  .lean()
            : [],
        facilityIds.length
            ? Facility.find({ _id: { $in: facilityIds } }).select('name').lean()
            : [],
        companyIds.length
            ? Company.find({ _id: { $in: companyIds } }).select('name').lean()
            : [],
        clubIds.length ? Club.find({ _id: { $in: clubIds } }).select('name').lean() : [],
        communityIds.length
            ? ClubGroup.find({ _id: { $in: communityIds } }).select('name clubName').lean()
            : [],
    ]);

    const eventMap = new Map(events.map((e) => [e._id.toString(), e]));
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));
    const coachMap = new Map(coaches.map((c) => [c._id.toString(), c]));
    const coachUserMap = new Map(
        coachUsers.filter((u) => u.coach).map((u) => [u.coach.toString(), u])
    );
    const facilityMap = new Map(facilities.map((f) => [f._id.toString(), f]));
    const companyMap = new Map(companies.map((c) => [c._id.toString(), c]));
    const clubMap = new Map(clubs.map((c) => [c._id.toString(), c]));
    const communityMap = new Map(communities.map((g) => [g._id.toString(), g]));

    return rows.map((row) => {
        const id = row.targetId.toString();
        let targetSummary = null;
        if (row.targetType === 'event') {
            const ev = eventMap.get(id);
            targetSummary = ev
                ? { label: ev.name, status: ev.status, owner: ev.owner, startTime: ev.startTime }
                : { label: 'Deleted event' };
        } else if (row.targetType === 'user') {
            const u = userMap.get(id);
            targetSummary = u
                ? {
                      label: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                      email: u.email,
                      photo: u.photo,
                  }
                : { label: 'Deleted user' };
        } else if (row.targetType === 'coach') {
            const c = coachMap.get(id);
            const u = coachUserMap.get(id);
            targetSummary = {
                label: c?.name || (u ? `${u.firstName} ${u.lastName}`.trim() : 'Coach'),
                user: u || null,
                isVerified: c?.isVerified,
            };
        } else if (row.targetType === 'facility') {
            const f = facilityMap.get(id);
            targetSummary = f ? { label: f.name } : { label: 'Deleted facility' };
        } else if (row.targetType === 'company') {
            const c = companyMap.get(id);
            targetSummary = c ? { label: c.name } : { label: 'Deleted company' };
        } else if (row.targetType === 'club') {
            const c = clubMap.get(id);
            targetSummary = c ? { label: c.name } : { label: 'Deleted club' };
        } else if (row.targetType === 'community') {
            const g = communityMap.get(id);
            targetSummary = g
                ? { label: g.name, clubName: g.clubName }
                : { label: 'Deleted community' };
        }
        return { ...row, targetSummary };
    });
}

/** Submit a report (authenticated users only). */
export const submitReport = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const parsed = submitReportSchema.parse(req.body ?? {});
        const targetId = new mongoose.Types.ObjectId(parsed.targetId);

        if (parsed.targetType === 'event' && parsed.reason === 'misleading_event') {
            // ok
        } else if (parsed.reason === 'misleading_event') {
            throw new AppError(400, 'misleading_event reason is only valid for events.');
        }

        await assertTargetExists(parsed.targetType, targetId);
        await assertNotSelfReport(req.user._id, parsed.targetType, targetId);

        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentCount = await Report.countDocuments({
            reporter: req.user._id,
            createdAt: { $gte: since },
        });
        if (recentCount >= MAX_REPORTS_PER_DAY) {
            throw new AppError(429, 'Too many reports today. Please try again later.');
        }

        const duplicate = await Report.findOne({
            reporter: req.user._id,
            targetType: parsed.targetType,
            targetId,
            status: { $in: OPEN_STATUSES },
        }).lean();
        if (duplicate) {
            throw new AppError(409, 'You already reported this. It is under review.');
        }

        const ip =
            req.ip ||
            (typeof req.headers['x-forwarded-for'] === 'string'
                ? req.headers['x-forwarded-for'].split(',')[0].trim()
                : '') ||
            '';

        const report = await Report.create({
            reporter: req.user._id,
            reporterIp: ip,
            targetType: parsed.targetType,
            targetId,
            reason: parsed.reason || null,
            details: parsed.details || '',
        });

        res.status(201).json({
            success: true,
            message: 'Report submitted. Our team will review it.',
            data: report,
        });
    } catch (err) {
        next(err);
    }
};

/** Admin: list reports. */
export const listReports = async (req, res, next) => {
    try {
        const { perPage, pageNumber, status, targetType, search } = adminListReportsSchema.parse(
            req.body ?? {}
        );

        const filter = {};
        if (status && status !== 'all') filter.status = status;
        if (targetType) filter.targetType = targetType;

        const trimmed = typeof search === 'string' ? search.trim() : '';
        if (trimmed) {
            filter.$or = [
                { details: { $regex: trimmed, $options: 'i' } },
                { reason: { $regex: trimmed, $options: 'i' } },
            ];
            if (/^[a-fA-F0-9]{24}$/.test(trimmed)) {
                filter.$or.push({ targetId: trimmed }, { reporter: trimmed });
            }
        }

        const [rows, total] = await Promise.all([
            Report.find(filter)
                .populate('reporter', 'firstName lastName email')
                .populate('resolution.resolvedBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * perPage)
                .limit(perPage)
                .lean(),
            Report.countDocuments(filter),
        ]);

        const data = await enrichReports(rows);

        res.status(200).json({
            success: true,
            data,
            total,
            perPage,
            pageNumber,
            totalPages: Math.ceil(total / perPage) || 1,
        });
    } catch (err) {
        next(err);
    }
};

/** Admin: resolve a report with an action. */
export const resolveReport = async (req, res, next) => {
    try {
        const reportId = mongoObjectId.parse(req.params.reportId);
        const { action, note } = resolveReportSchema.parse(req.body ?? {});

        const report = await Report.findById(reportId);
        if (!report) throw new AppError(404, 'Report not found.');
        if (report.status !== 'open') {
            throw new AppError(400, 'This report has already been handled.');
        }

        let resolutionAction = 'none';

        if (action === 'dismiss') {
            report.status = 'dismissed';
        } else if (action === 'suspend_user') {
            const userId = await resolveUserIdForTarget(report.targetType, report.targetId);
            if (!userId) throw new AppError(404, 'Could not find a user to suspend for this report.');
            if (userId.toString() === req.user._id.toString()) {
                throw new AppError(400, 'You cannot suspend your own account.');
            }
            await User.findByIdAndUpdate(userId, { $set: { isActive: false } });
            report.status = 'resolved';
            resolutionAction = 'user_suspended';
        } else if (action === 'cancel_event') {
            if (report.targetType !== 'event') {
                throw new AppError(400, 'cancel_event is only valid for event reports.');
            }
            const event = await Event.findById(report.targetId);
            if (!event) throw new AppError(404, 'Event not found.');
            if (event.status !== 'cancelled') {
                event.status = 'cancelled';
                event.cancelledAt = new Date();
                await event.save();
            }
            report.status = 'resolved';
            resolutionAction = 'event_cancelled';
        } else if (action === 'delete_event') {
            if (report.targetType !== 'event') {
                throw new AppError(400, 'delete_event is only valid for event reports.');
            }
            const deleted = await Event.findByIdAndDelete(report.targetId);
            if (!deleted) throw new AppError(404, 'Event not found.');
            report.status = 'resolved';
            resolutionAction = 'event_deleted';
        }

        report.resolution = {
            action: resolutionAction,
            note: note || '',
            resolvedBy: req.user._id,
            resolvedAt: new Date(),
        };
        await report.save();

        await report.populate([
            { path: 'reporter', select: 'firstName lastName email' },
            { path: 'resolution.resolvedBy', select: 'firstName lastName email' },
        ]);

        const enriched = await enrichReports([report.toObject()]);

        res.status(200).json({
            success: true,
            message: 'Report updated.',
            data: enriched[0],
        });
    } catch (err) {
        next(err);
    }
};
