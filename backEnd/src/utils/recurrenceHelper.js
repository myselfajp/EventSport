/**
 * Generate session start/end times for a recurring series.
 */
export function generateSessionSchedule({
    anchorStartTime,
    anchorEndTime,
    frequency,
    interval,
    sessionCount,
}) {
    const start = new Date(anchorStartTime);
    const end = new Date(anchorEndTime);
    const durationMs = end.getTime() - start.getTime();
    if (durationMs <= 0) {
        throw new Error('Event end time must be after start time.');
    }

    const sessions = [];
    let curStart = new Date(start);
    let curEnd = new Date(end);

    for (let i = 0; i < sessionCount; i++) {
        sessions.push({
            sessionIndex: i + 1,
            startTime: new Date(curStart),
            endTime: new Date(curEnd),
        });

        if (i === sessionCount - 1) break;

        if (frequency === 'weekly') {
            curStart.setDate(curStart.getDate() + 7 * interval);
            curEnd.setDate(curEnd.getDate() + 7 * interval);
        } else if (frequency === 'daily') {
            curStart.setDate(curStart.getDate() + interval);
            curEnd.setDate(curEnd.getDate() + interval);
        } else if (frequency === 'monthly') {
            curStart.setMonth(curStart.getMonth() + interval);
            curEnd.setMonth(curEnd.getMonth() + interval);
        } else {
            throw new Error(`Unsupported frequency: ${frequency}`);
        }
    }

    return sessions;
}

export function getListingPricePerSlot() {
    const raw = process.env.LISTING_PRICE_PER_SLOT;
    const n = raw != null && raw !== '' ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function frequencyLabel(frequency, interval) {
    const iv = interval > 1 ? ` (every ${interval})` : '';
    if (frequency === 'weekly') return `Weekly${iv}`;
    if (frequency === 'daily') return `Every ${interval} day(s)`;
    if (frequency === 'monthly') return `Monthly${iv}`;
    return frequency;
}
