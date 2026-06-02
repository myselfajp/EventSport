import Reservation from '../models/reservationModel.js';
import User from '../models/userModel.js';
import {
    resolveCheckInOpensHours,
    checkInOpensAt,
} from './eventCheckInHelper.js';
import {
    notifyCheckInOpensReminder24h,
    notifyCheckInOpensReminder2h,
    notifyCheckInOpensReminder1h,
    notifyCheckInPaymentWarning15m,
    notifyReservationReminder,
    notifyEventStartsSoon2h,
} from './notificationHelper.js';

const MS_24H = 24 * 60 * 60 * 1000;
const MS_2H = 2 * 60 * 60 * 1000;
const MS_1H = 1 * 60 * 60 * 1000;
const MS_15M = 15 * 60 * 1000;
/** Grace window so a 10-minute cron tick does not miss the target. */
const WINDOW_MS = 15 * 60 * 1000;

function isInReminderWindow(nowMs, targetMs) {
    return nowMs >= targetMs && nowMs < targetMs + WINDOW_MS;
}

function formatEventTime(iso) {
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
 * Send check-in opening reminders (24h, 2h, 1h before check-in opens),
 * a 15-minute payment warning for paid events,
 * and a final "event starts soon" reminder.
 */
export async function runCheckInReminders() {
    const now = new Date();
    const nowMs = now.getTime();

    const reservations = await Reservation.find({
        isCancelled: false,
        isCheckedIn: false,
        isWaitListed: false,
        $or: [{ isApproved: true }, { isJoined: true }],
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
        // Skip events the user hasn't paid for, except for the early opens-tomorrow
        // reminder where unpaid users still need to know about check-in.
        const startMs = new Date(event.startTime).getTime();

        const hours = await resolveCheckInOpensHours(event);
        const opensAt = checkInOpensAt(event.startTime, hours);
        const opensMs = opensAt.getTime();

        const user = await User.findOne({ participant: reservation.participant })
            .select('_id isActive')
            .lean();
        if (!user || user.isActive === false) continue;

        const userId = user._id.toString();
        const eventId = event._id.toString();
        const eventName = event.name;
        const opensLabel = formatEventTime(opensAt);
        const startLabel = formatEventTime(event.startTime);

        // ---- 24h before check-in opens ----
        const target24 = opensMs - MS_24H;
        if (
            opensMs > nowMs &&
            !reservation.checkInReminder24hSentAt &&
            isInReminderWindow(nowMs, target24)
        ) {
            try {
                await notifyCheckInOpensReminder24h(
                    userId,
                    eventId,
                    eventName,
                    opensAt,
                    opensLabel
                );
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { checkInReminder24hSentAt: now } }
                );
            } catch (err) {
                console.error('24h reminder failed:', err);
            }
        }

        // ---- 2h before check-in opens ----
        const target2 = opensMs - MS_2H;
        if (
            opensMs > nowMs &&
            !reservation.checkInReminder2hSentAt &&
            isInReminderWindow(nowMs, target2)
        ) {
            try {
                await notifyCheckInOpensReminder2h(
                    userId,
                    eventId,
                    eventName,
                    opensAt,
                    opensLabel
                );
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { checkInReminder2hSentAt: now } }
                );
            } catch (err) {
                console.error('2h reminder failed:', err);
            }
        }

        // ---- 1h before check-in opens ----
        const target1 = opensMs - MS_1H;
        if (
            opensMs > nowMs &&
            !reservation.checkInReminder1hSentAt &&
            isInReminderWindow(nowMs, target1)
        ) {
            try {
                await notifyCheckInOpensReminder1h(
                    userId,
                    eventId,
                    eventName,
                    opensAt,
                    opensLabel
                );
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { checkInReminder1hSentAt: now } }
                );
            } catch (err) {
                console.error('1h reminder failed:', err);
            }
        }

        // ---- 15m before charge / non-refundable window (paid events only) ----
        // Charge happens at check-in. We warn 15 minutes before opens.
        const target15m = opensMs - MS_15M;
        if (
            !isFree &&
            reservation.isPaid !== true &&
            opensMs > nowMs &&
            !reservation.checkInPaymentWarning15mSentAt &&
            isInReminderWindow(nowMs, target15m)
        ) {
            try {
                await notifyCheckInPaymentWarning15m({
                    userId,
                    eventId,
                    eventName,
                    chargeAt: opensAt,
                });
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { checkInPaymentWarning15mSentAt: now } }
                );
            } catch (err) {
                console.error('15m payment warning failed:', err);
            }
        }

        // ---- Event starts in ~2 hours (joined gamers) ----
        const target2hStart = startMs - MS_2H;
        if (
            startMs > nowMs &&
            !reservation.eventStartReminder2hSentAt &&
            isInReminderWindow(nowMs, target2hStart)
        ) {
            try {
                await notifyEventStartsSoon2h(
                    userId,
                    eventId,
                    eventName,
                    new Date(startMs),
                    startLabel
                );
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { eventStartReminder2hSentAt: now } }
                );
            } catch (err) {
                console.error('2h event start reminder failed:', err);
            }
        }

        // ---- Final event start reminder (~30 min before start) ----
        const target30Start = startMs - 30 * 60 * 1000;
        if (
            !reservation.eventStartReminderSentAt &&
            isInReminderWindow(nowMs, target30Start)
        ) {
            try {
                await notifyReservationReminder(
                    userId,
                    eventId,
                    eventName,
                    new Date(startMs)
                );
                await Reservation.updateOne(
                    { _id: reservation._id },
                    { $set: { eventStartReminderSentAt: now } }
                );
            } catch (err) {
                console.error('event start reminder failed:', err);
            }
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
