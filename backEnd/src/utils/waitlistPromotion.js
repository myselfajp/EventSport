import Reservation from '../models/reservationModel.js';
import Event from '../models/eventModel.js';
import User from '../models/userModel.js';
import { notifyWaitlistPromoted } from './notificationHelper.js';

/**
 * If a spot has opened up on an event (e.g. an approved reservation was
 * cancelled or capacity was increased), promote the oldest waitlisted entry
 * to an approved reservation and notify the user.
 *
 * Best-effort: errors are logged, never thrown to the caller.
 */
export async function promoteWaitlistIfNeeded(eventId) {
    if (!eventId) return null;
    try {
        const event = await Event.findById(eventId).select('capacity name status');
        if (!event || event.status === 'cancelled') return null;

        const approvedCount = await Reservation.countDocuments({
            event: eventId,
            isCancelled: false,
            isWaitListed: false,
        });
        if (approvedCount >= (event.capacity ?? 0)) return null;

        // Find the next waitlisted reservation in FIFO order.
        const next = await Reservation.findOneAndUpdate(
            {
                event: eventId,
                isCancelled: false,
                isWaitListed: true,
            },
            {
                $set: {
                    isWaitListed: false,
                    isApproved: true,
                },
            },
            { new: true, sort: { createdAt: 1 } }
        );
        if (!next) return null;

        // Notify the user behind this participant.
        const promotedUser = await User.findOne({ participant: next.participant })
            .select('_id')
            .lean();
        if (promotedUser?._id) {
            await notifyWaitlistPromoted({
                userId: promotedUser._id.toString(),
                eventId: eventId.toString(),
                eventName: event.name,
            });
        }

        return next;
    } catch (err) {
        console.error('promoteWaitlistIfNeeded failed:', err);
        return null;
    }
}
