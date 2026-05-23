import BlacklistEntry from '../models/blacklistEntryModel.js';
import { AppError } from '../utils/appError.js';

export function normalizeBlacklistEmail(email) {
    return String(email || '')
        .trim()
        .toLowerCase();
}

/** Canonical phone key: 90 + 10 digits (TR mobile without +). */
export function normalizeBlacklistPhone(phone) {
    const numeric = String(phone || '').replace(/\D/g, '');
    let digits = numeric.replace(/^90/, '');
    if (digits.startsWith('0')) digits = digits.slice(1);
    if (digits.startsWith('5')) {
        digits = '90' + digits;
    } else if (!digits.startsWith('90')) {
        digits = '90' + digits;
    }
    return digits.slice(0, 12);
}

export async function isBlacklisted({ email, phone, userId }) {
    const or = [];
    if (email) {
        const e = normalizeBlacklistEmail(email);
        if (e) or.push({ type: 'email', value: e });
    }
    if (phone) {
        const p = normalizeBlacklistPhone(phone);
        if (p.length >= 10) or.push({ type: 'phone', value: p });
    }
    if (userId) {
        or.push({ type: 'userId', value: String(userId) });
    }
    if (!or.length) return false;
    const hit = await BlacklistEntry.findOne({ $or: or }).lean();
    return Boolean(hit);
}

export async function assertNotBlacklisted({ email, phone, userId }) {
    const blocked = await isBlacklisted({ email, phone, userId });
    if (blocked) {
        throw new AppError(403, 'This account is blocked. Contact support if you believe this is an error.');
    }
}
