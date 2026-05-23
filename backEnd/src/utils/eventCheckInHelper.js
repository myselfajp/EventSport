import { EventStyle } from '../models/referenceDataModel.js';

/** Default: 48 hours (previous hard-coded 2-day window). */
export const DEFAULT_CHECK_IN_OPENS_HOURS = 48;

export function checkInOpensHoursFromStyle(styleDoc) {
    const hours = styleDoc?.checkInOpensHoursBeforeStart;
    if (typeof hours === 'number' && hours >= 0) return hours;
    return DEFAULT_CHECK_IN_OPENS_HOURS;
}

export async function resolveCheckInOpensHours(event) {
    const eventOverride = event?.checkInOpensHoursBeforeStart;
    if (typeof eventOverride === 'number' && eventOverride >= 0) {
        return eventOverride;
    }

    if (!event?.style) return DEFAULT_CHECK_IN_OPENS_HOURS;

    const styleId = event.style._id ?? event.style;
    const style = await EventStyle.findById(styleId)
        .select('checkInOpensHoursBeforeStart')
        .lean();

    return checkInOpensHoursFromStyle(style);
}

export function checkInOpensAt(startTime, hoursBefore) {
    const start = new Date(startTime);
    const ms = hoursBefore * 60 * 60 * 1000;
    return new Date(start.getTime() - ms);
}

export function isWithinCheckInWindow(now, startTime, hoursBefore) {
    const start = new Date(startTime);
    const opensAt = checkInOpensAt(startTime, hoursBefore);
    const timeDiff = start.getTime() - now.getTime();
    const windowMs = hoursBefore * 60 * 60 * 1000;
    return now >= opensAt && timeDiff < windowMs && timeDiff > 0;
}

export function attachCheckInMeta(eventDoc, hoursBefore) {
    const plain =
        typeof eventDoc?.toObject === 'function' ? eventDoc.toObject() : { ...eventDoc };
    const hours = hoursBefore ?? DEFAULT_CHECK_IN_OPENS_HOURS;
    plain.checkInOpensHoursBeforeStart = hours;
    if (plain.startTime) {
        plain.checkInOpensAt = checkInOpensAt(plain.startTime, hours);
    }
    return plain;
}
