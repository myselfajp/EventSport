import Reservation from '../models/reservationModel.js';
import User from '../models/userModel.js';
import {
    resolveCheckInOpensHours,
    checkInOpensAt,
} from './eventCheckInHelper.js';
import {
    notifyCheckInOpensReminder24h,
    notifyCheckInOpensReminder2h,
} from './notificationHelper.js';

const MS_24H = 24 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
/** Grace window so a 10-minute cron tick does not miss the target. */
const WINDOW_MS = 15 * 60 * 1000;

function isInReminderWindow(nowMs, targetMs) {
    return nowMs >= targetMs && nowMs < targetMs + WINDOW_MS;
}

function formatOpensAt(iso) {
    try {
        return new Intl.DateTimeFormat('en-GB', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        }).format(new Date(iso));
    } catch {
        return '';
    }
}

/**
 * Send check-in opening reminders: 24h and 2h before check-in opens.
 */
export async function runCheckInReminders() {
    const now = new Date();
    const nowMs = now.getTime();

    const reservations = await Reservation.find({
        isCancelled: false,
        isCheckedIn: false,
        isApproved: true,
        isWaitListed: false,
    })
        .populate({
            path: 'event',
            select: 'name startTime endTime status style priceType checkInOpensHoursBeforeStart',
        })
        .lean();

    for (const reservation of reservations) {
        const event = reservation.event;
        if (!event || event.status === 'cancelled') continue;
        if (event.endTime && now >= new Date(event.endTime)) continue;
        if (now >= new Date(event.startTime)) continue;

        const isFree = event.priceType === 'Free';
        if (!isFree && !reservation.isPaid) continue;

        const hours = await resolveCheckInOpensHours(event);
        const opensAt = checkInOpensAt(event.startTime, hours);
        const opensMs = opensAt.getTime();
        if (opensMs <= nowMs) continue;

        const user = await User.findOne({ participant: reservation.participant })
            .select('_id isActive')
            .lean();
        if (!user || user.isActive === false) continue;

        const userId = user._id.toString();
        const eventId = event._id.toString();
        const eventName = event.name;
        const opensLabel = formatOpensAt(opensAt);

        const target24 = opensMs - MS_24H;
        if (
            !reservation.checkInReminder24hSentAt &&
            isInReminderWindow(nowMs, target24)
        ) {
            await notifyCheckInOpensReminder24h(userId, eventId, eventName, opensAt, opensLabel);
            await Reservation.updateOne(
                { _id: reservation._id },
                { $set: { checkInReminder24hSentAt: now } }
            );
        }

        const target2 = opensMs - MS_2H;
        if (
            !reservation.checkInReminder2hSentAt &&
            isInReminderWindow(nowMs, target2)
        ) {
            await notifyCheckInOpensReminder2h(userId, eventId, eventName, opensAt, opensLabel);
            await Reservation.updateOne(
                { _id: reservation._id },
                { $set: { checkInReminder2hSentAt: now } }
            );
        }
    }
}

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;

export function startCheckInReminderScheduler() {
    if (process.env.CHECK_IN_REMINDERS_ENABLED === 'false') {
        console.log('⏭️ Check-in reminder scheduler disabled');
        return;
    }

    const intervalMs = Number(process.env.CHECK_IN_REMINDER_INTERVAL_MS) || DEFAULT_INTERVAL_MS;

    const tick = () => {
        runCheckInReminders().catch((err) => {
            console.error('Check-in reminder job failed:', err);
        });
    };

    tick();
    setInterval(tick, intervalMs);
    console.log(`✅ Check-in reminder scheduler started (every ${intervalMs / 60000} min)`);
}
