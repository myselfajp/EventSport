import Reservation from '../models/reservationModel.js';
import User from '../models/userModel.js';
import {
    notifyReservationEventCancelled,
    notifyReservationEventUpdated,
} from './notificationHelper.js';

/**
 * Resolve the user IDs that should be notified about a reservation-affecting
 * change (cancel / edit). Includes only active reservations.
 */
/** Users with an active join (not waitlisted / cancelled). */
async function resolveJoinedUserIds(eventId) {
    const reservations = await Reservation.find({
        event: eventId,
        isCancelled: false,
        isWaitListed: false,
    })
        .select('participant')
        .lean();

    if (reservations.length === 0) return [];

    const participantIds = [...new Set(reservations.map((r) => String(r.participant)))];
    const users = await User.find({
        participant: { $in: participantIds },
        isActive: { $ne: false },
    })
        .select('_id')
        .lean();

    return users.map((u) => u._id.toString());
}

/**
 * Notify all reserved (non-cancelled) users that the event has been cancelled.
 * Best-effort: errors logged, never thrown.
 */
export async function notifyReservedUsersEventCancelled({ eventId, eventName }) {
    if (!eventId) return;
    try {
        const userIds = await resolveJoinedUserIds(eventId);
        if (userIds.length === 0) return;
        await notifyReservationEventCancelled({
            userIds,
            eventId: eventId.toString(),
            eventName,
        });
    } catch (err) {
        console.error('Failed to notify reserved users (cancel):', err);
    }
}

/**
 * Notify reserved users that the event has been updated (date / location, etc.).
 * `changeSummary` is an optional human-readable string describing the change.
 */
export async function notifyReservedUsersEventUpdated({
    eventId,
    eventName,
    changeSummary,
}) {
    if (!eventId) return;
    try {
        const userIds = await resolveJoinedUserIds(eventId);
        if (userIds.length === 0) return;
        await notifyReservationEventUpdated({
            userIds,
            eventId: eventId.toString(),
            eventName,
            changeSummary,
        });
    } catch (err) {
        console.error('Failed to notify reserved users (update):', err);
    }
}
