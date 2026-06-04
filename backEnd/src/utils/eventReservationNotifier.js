import Reservation from '../models/reservationModel.js';
import FavoriteList from '../models/favoriteListModel.js';
import User from '../models/userModel.js';
import {
    notifyReservationEventCancelled,
    notifyReservationEventUpdated,
    notifyLikedEventCancelled,
    notifyLikedEventUpdated,
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

/** Users who liked (favorited) the event, excluding given user ids. */
async function resolveLikedUserIds(eventId, excludeUserIds = []) {
    const exclude = new Set(excludeUserIds.map(String));
    const rows = await FavoriteList.find({ event: eventId })
        .select('user')
        .lean();

    const ids = [
        ...new Set(
            rows
                .map((r) => r.user?.toString())
                .filter((id) => id && !exclude.has(id))
        ),
    ];

    if (ids.length === 0) return [];

    const active = await User.find({
        _id: { $in: ids },
        isActive: { $ne: false },
    })
        .select('_id')
        .lean();

    return active.map((u) => u._id.toString());
}

/**
 * Notify all reserved (non-cancelled) users that the event has been cancelled.
 * Best-effort: errors logged, never thrown.
 */
export async function notifyReservedUsersEventCancelled({ eventId, eventName }) {
    if (!eventId) return;
    try {
        const userIds = await resolveJoinedUserIds(eventId);
        if (userIds.length > 0) {
            await notifyReservationEventCancelled({
                userIds,
                eventId: eventId.toString(),
                eventName,
            });
        }

        const likedUserIds = await resolveLikedUserIds(eventId, userIds);
        if (likedUserIds.length > 0) {
            await notifyLikedEventCancelled({
                userIds: likedUserIds,
                eventId: eventId.toString(),
                eventName,
            });
        }
    } catch (err) {
        console.error('Failed to notify reserved users (cancel):', err);
    }
}

/**
 * Notify reserved users that the event has been updated (date / location, etc.).
 * Also notifies users who liked the event (excluding joined users to avoid duplicate alerts).
 */
export async function notifyReservedUsersEventUpdated({
    eventId,
    eventName,
    changeSummary,
}) {
    if (!eventId) return;
    try {
        const userIds = await resolveJoinedUserIds(eventId);
        if (userIds.length > 0) {
            await notifyReservationEventUpdated({
                userIds,
                eventId: eventId.toString(),
                eventName,
                changeSummary,
            });
        }

        const likedUserIds = await resolveLikedUserIds(eventId, userIds);
        if (likedUserIds.length > 0) {
            await notifyLikedEventUpdated({
                userIds: likedUserIds,
                eventId: eventId.toString(),
                eventName,
                changeSummary,
            });
        }
    } catch (err) {
        console.error('Failed to notify reserved users (update):', err);
    }
}
