import { unlink } from 'fs/promises';
import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import PerformanceMember, { PERFORMANCE_BRANCHES } from '../models/performanceMemberModel.js';
import { removeCoachProfileForUser } from '../utils/providerRoleSwitch.js';
import { getBasicPlanAssignmentFields } from '../utils/subscriptionPlanHelper.js';
import { writeAuditLog, changedKeys } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';

const normalizeText = (value, max = 2000) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

function parseProfilePayload(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        throw new AppError(400, 'Invalid profile payload.');
    }
}

export const getCurrentProfile = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);
        if (!req.user.performanceMember) {
            return res.status(200).json({ success: true, data: null });
        }

        const profile = await PerformanceMember.findById(req.user.performanceMember).lean();
        res.status(200).json({ success: true, data: profile || null });
    } catch (err) {
        next(err);
    }
};

export const createOrUpdateProfile = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const payload = parseProfilePayload(req.body?.data || req.body);
        const confirmRoleSwitch = payload.confirmRoleSwitch === true;

        const freshUser = await User.findById(req.user._id).select('coach performanceMember').lean();
        const switchedFromCoach = !!freshUser?.coach;
        if (freshUser?.coach) {
            if (!confirmRoleSwitch) {
                throw new AppError(
                    409,
                    'You are currently a coach. Applying to the Performance Team will remove your coach profile, service request data, and related messages. Confirm the role switch to continue.'
                );
            }
            await removeCoachProfileForUser(req.user._id);
        }

        const branch = normalizeText(payload.branch, 64);
        if (!PERFORMANCE_BRANCHES.includes(branch)) {
            throw new AppError(400, 'Invalid performance branch.');
        }

        const existing = req.user.performanceMember
            ? await PerformanceMember.findById(req.user.performanceMember)
            : await PerformanceMember.findOne({ user: req.user._id });

        if (!existing && !req.fileMeta) {
            throw new AppError(400, 'Certificate is required.');
        }

        const certificate = req.fileMeta || existing?.certificate;
        const isNewProfile = !existing;
        const basicFields = isNewProfile ? await getBasicPlanAssignmentFields() : {};
        const update = {
            user: req.user._id,
            name: `${req.user.firstName} ${req.user.lastName}`.trim(),
            branch,
            title: normalizeText(payload.title, 160),
            about: normalizeText(payload.about, 2000),
            certificate,
            status: 'Pending',
            isVerified: false,
            rejectionReason: '',
            ...(isNewProfile ? basicFields : {}),
        };

        if (existing?.certificate?.path && req.fileMeta?.path) {
            try {
                await unlink(existing.certificate.path);
            } catch (unlinkErr) {
                console.warn('Failed to delete old performance certificate:', unlinkErr);
            }
        }

        const profile = existing
            ? await PerformanceMember.findByIdAndUpdate(existing._id, update, { new: true })
            : await PerformanceMember.create(update);

        await User.findByIdAndUpdate(req.user._id, { performanceMember: profile._id });

        await writeAuditLog({
            req,
            actorRole: 'performance',
            action: existing
                ? AUDIT_ACTIONS.PERFORMANCE_APPLICATION_UPDATED
                : AUDIT_ACTIONS.PERFORMANCE_APPLICATION_CREATED,
            entityType: 'performance_member',
            entityId: profile._id,
            changedFields: existing
                ? changedKeys(existing, profile, ['branch', 'title', 'about', 'status', 'isVerified'])
                : ['branch', 'title', 'about', 'status'],
            before: existing,
            after: profile,
            description: existing
                ? 'Performance Team application updated'
                : 'Performance Team application created',
        });
        if (switchedFromCoach) {
            await writeAuditLog({
                req,
                actorRole: 'performance',
                targetUserId: req.user._id,
                targetRole: 'performance',
                action: AUDIT_ACTIONS.PROVIDER_ROLE_SWITCHED,
                entityType: 'user',
                entityId: req.user._id,
                description: 'Provider role switched from coach to Performance Team',
                before: { providerRole: 'coach' },
                after: { providerRole: 'performance' },
            });
        }
        res.status(existing ? 200 : 201).json({
            success: true,
            message: 'Performance Team application saved.',
            data: profile,
        });
    } catch (err) {
        if (req.fileMeta?.path) {
            try {
                await unlink(req.fileMeta.path);
            } catch (unlinkErr) {
                console.warn('Failed to cleanup performance certificate:', unlinkErr);
            }
        }
        next(err);
    }
};

export const listApprovedMembers = async (req, res, next) => {
    try {
        const branch = normalizeText(req.query?.branch, 64);
        const search = normalizeText(req.query?.search, 120);
        const pageNumber = Math.max(1, Number.parseInt(req.query?.pageNumber, 10) || 1);
        const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query?.perPage, 10) || 10));

        const filter = { status: 'Approved', isVerified: true };
        if (branch) {
            if (!PERFORMANCE_BRANCHES.includes(branch)) {
                throw new AppError(400, 'Invalid performance branch.');
            }
            filter.branch = branch;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { title: { $regex: search, $options: 'i' } },
            ];
        }

        const skip = (pageNumber - 1) * perPage;
        const [members, total] = await Promise.all([
            PerformanceMember.find(filter)
                .populate('user', 'firstName lastName photo')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(perPage)
                .lean(),
            PerformanceMember.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: members,
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
