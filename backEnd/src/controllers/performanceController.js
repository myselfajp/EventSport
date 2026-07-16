import { unlink } from 'fs/promises';
import { AppError } from '../utils/appError.js';
import User from '../models/userModel.js';
import PerformanceMember, { PERFORMANCE_BRANCHES } from '../models/performanceMemberModel.js';

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

        const freshUser = await User.findById(req.user._id).select('coach performanceMember').lean();
        if (freshUser?.coach) {
            throw new AppError(
                403,
                'Coaches cannot apply to the Performance Team. Coach and Performance Team roles are mutually exclusive.'
            );
        }

        const payload = parseProfilePayload(req.body?.data || req.body);
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
        const filter = { status: 'Approved', isVerified: true };
        if (branch) {
            if (!PERFORMANCE_BRANCHES.includes(branch)) {
                throw new AppError(400, 'Invalid performance branch.');
            }
            filter.branch = branch;
        }

        const members = await PerformanceMember.find(filter)
            .populate('user', 'firstName lastName photo')
            .sort({ createdAt: -1 })
            .lean();

        res.status(200).json({ success: true, data: members });
    } catch (err) {
        next(err);
    }
};
