import mongoose from 'mongoose';
import User from '../models/userModel.js';
import BlacklistEntry from '../models/blacklistEntryModel.js';
import { AppError } from '../utils/appError.js';
import { SearchQuerySchema, mongoObjectId } from '../utils/validation.js';
import {
    normalizeBlacklistEmail,
    normalizeBlacklistPhone,
} from '../utils/blacklistHelper.js';

function normalizeValue(type, raw) {
    if (type === 'email') return normalizeBlacklistEmail(raw);
    if (type === 'phone') return normalizeBlacklistPhone(raw);
    if (type === 'userId') {
        const id = mongoObjectId.parse(raw);
        return id.toString();
    }
    throw new AppError(400, 'Invalid blacklist type');
}

export const listBlacklist = async (req, res, next) => {
    try {
        const { perPage, pageNumber, search } = SearchQuerySchema.parse({
            perPage: req.body?.perPage || req.query?.perPage,
            pageNumber: req.body?.pageNumber || req.query?.pageNumber,
            search: req.body?.search || req.query?.search,
        });

        const query = {};
        const trimmed = search?.trim();
        if (trimmed) {
            query.$or = [
                { value: { $regex: trimmed, $options: 'i' } },
                { reason: { $regex: trimmed, $options: 'i' } },
                { type: { $regex: trimmed, $options: 'i' } },
            ];
            if (/^[a-fA-F0-9]{24}$/.test(trimmed) && mongoose.Types.ObjectId.isValid(trimmed)) {
                query.$or.push({ linkedUser: trimmed }, { createdBy: trimmed });
            }
        }

        const [data, total] = await Promise.all([
            BlacklistEntry.find(query)
                .populate('linkedUser', 'firstName lastName email')
                .populate('createdBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .skip((pageNumber - 1) * perPage)
                .limit(perPage)
                .lean(),
            BlacklistEntry.countDocuments(query),
        ]);

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

export const createBlacklistEntry = async (req, res, next) => {
    try {
        const { type, value, reason } = req.body || {};
        if (!type || !value) {
            throw new AppError(400, 'type and value are required');
        }
        if (!['email', 'phone', 'userId'].includes(type)) {
            throw new AppError(400, 'type must be email, phone, or userId');
        }

        const normalized = normalizeValue(type, value);
        if (!normalized) {
            throw new AppError(400, 'value is required');
        }

        let linkedUser = null;
        if (type === 'userId') {
            linkedUser = normalized;
            const u = await User.findById(normalized);
            if (!u) throw new AppError(404, 'User not found');
        }

        const entry = await BlacklistEntry.create({
            type,
            value: normalized,
            reason: typeof reason === 'string' ? reason.trim() : '',
            linkedUser,
            createdBy: req.user._id,
        });

        await entry.populate([
            { path: 'linkedUser', select: 'firstName lastName email' },
            { path: 'createdBy', select: 'firstName lastName email' },
        ]);

        res.status(201).json({ success: true, data: entry });
    } catch (err) {
        if (err.code === 11000) {
            return next(new AppError(409, 'This value is already on the blacklist'));
        }
        next(err);
    }
};

export const blacklistUser = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const { reason, deactivate } = req.body || {};
        const reasonText = typeof reason === 'string' ? reason.trim() : '';

        const user = await User.findById(userId);
        if (!user) {
            throw new AppError(404, 'User not found');
        }

        if (userId.toString() === req.user._id.toString()) {
            throw new AppError(400, 'You cannot blacklist your own account');
        }

        const toCreate = [];
        const email = normalizeBlacklistEmail(user.email);
        if (email) {
            toCreate.push({ type: 'email', value: email });
        }
        const phone = normalizeBlacklistPhone(user.phone);
        if (phone.length >= 10) {
            toCreate.push({ type: 'phone', value: phone });
        }
        toCreate.push({ type: 'userId', value: userId.toString() });

        const created = [];
        const skipped = [];

        for (const item of toCreate) {
            try {
                const entry = await BlacklistEntry.create({
                    type: item.type,
                    value: item.value,
                    reason: reasonText,
                    linkedUser: userId,
                    createdBy: req.user._id,
                });
                created.push(entry);
            } catch (e) {
                if (e.code === 11000) {
                    skipped.push(item);
                } else {
                    throw e;
                }
            }
        }

        if (deactivate !== false) {
            await User.findByIdAndUpdate(userId, { $set: { isActive: false } });
        }

        res.status(200).json({
            success: true,
            message: 'User blacklisted',
            data: {
                created: created.length,
                skipped: skipped.length,
                deactivated: deactivate !== false,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const removeBlacklistEntry = async (req, res, next) => {
    try {
        const entryId = mongoObjectId.parse(req.params.entryId);
        const entry = await BlacklistEntry.findByIdAndDelete(entryId);
        if (!entry) {
            throw new AppError(404, 'Blacklist entry not found');
        }
        res.status(200).json({ success: true, message: 'Removed from blacklist' });
    } catch (err) {
        next(err);
    }
};
