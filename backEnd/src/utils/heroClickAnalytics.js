import mongoose from 'mongoose';
import { AppError } from './appError.js';

const ALLOWED_DAY_PRESETS = [7, 30, 90];

export function parseHeroAnalyticsQuery(query = {}) {
    const daysRaw = Number(query.days);
    const days = ALLOWED_DAY_PRESETS.includes(daysRaw) ? daysRaw : 30;

    const slideIdRaw = query.slideId ? String(query.slideId).trim() : '';
    let slideId = null;
    if (slideIdRaw) {
        if (!mongoose.Types.ObjectId.isValid(slideIdRaw)) {
            throw new AppError(400, 'Invalid slideId');
        }
        slideId = slideIdRaw;
    }

    const now = new Date();
    let from;
    let to;

    if (query.from || query.to) {
        if (!query.from || !query.to) {
            throw new AppError(400, 'Both from and to are required for a custom range');
        }
        from = new Date(String(query.from));
        to = new Date(String(query.to));
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
            throw new AppError(400, 'Invalid from or to date');
        }
        if (from > to) {
            throw new AppError(400, 'from must be before to');
        }
        to.setUTCHours(23, 59, 59, 999);
        from.setUTCHours(0, 0, 0, 0);
    } else {
        to = new Date(now);
        to.setUTCHours(23, 59, 59, 999);
        from = new Date(to);
        from.setUTCDate(from.getUTCDate() - (days - 1));
        from.setUTCHours(0, 0, 0, 0);
    }

    return { from, to, days, slideId };
}

export function fillDailySeries(from, to, rows) {
    const map = new Map(rows.map((r) => [r.date, r.count]));
    const out = [];
    const cur = new Date(from);
    cur.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(0, 0, 0, 0);

    while (cur <= end) {
        const date = cur.toISOString().slice(0, 10);
        out.push({ date, count: map.get(date) ?? 0 });
        cur.setUTCDate(cur.getUTCDate() + 1);
    }
    return out;
}
