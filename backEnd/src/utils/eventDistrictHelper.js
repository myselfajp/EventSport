import Facility from '../models/facilityModel.js';
import Salon from '../models/salonModel.js';
import User from '../models/userModel.js';
import { District } from '../models/locationModel.js';
import { AppError } from '../utils/appError.js';
import { notifyNearbyEventCreated } from './notificationHelper.js';

/**
 * Resolve event district for non-online events from explicit district or facility/salon.
 * Online events always return null (no district).
 */
export async function resolveEventDistrict({ type, district, facility, salon }) {
    if (type === 'Online') {
        return null;
    }

    if (district) {
        const exists = await District.exists({ _id: district });
        if (!exists) throw new AppError(400, 'Invalid district.');
        return district;
    }

    if (facility) {
        const doc = await Facility.findById(facility).select('location.district').lean();
        if (doc?.location?.district) return doc.location.district;
    }

    if (salon) {
        const doc = await Salon.findById(salon)
            .select('facility')
            .populate({ path: 'facility', select: 'location.district' })
            .lean();
        if (doc?.facility?.location?.district) return doc.facility.location.district;
    }

    throw new AppError(
        400,
        'District is required for non-online events. Select a district or a facility with a district.'
    );
}

const NOTIFY_BATCH_SIZE = 200;

/** Notify users in the same Istanbul district when a new physical event is created. */
export async function notifyUsersInEventDistrict(event, ownerUserId, coachName) {
    if (!event?.district || event.type === 'Online' || event.private) return;

    try {
        const districtDoc = await District.findById(event.district).select('name').lean();
        const districtName = districtDoc?.name || 'your district';

        const users = await User.find({
            'location.district': event.district,
            isActive: { $ne: false },
            _id: { $ne: ownerUserId },
        })
            .select('_id')
            .lean();

        const userIds = users.map((u) => u._id.toString());
        if (userIds.length === 0) return;

        for (let i = 0; i < userIds.length; i += NOTIFY_BATCH_SIZE) {
            const batch = userIds.slice(i, i + NOTIFY_BATCH_SIZE);
            await notifyNearbyEventCreated({
                eventId: event._id.toString(),
                eventName: event.name,
                coachName,
                districtName,
                userIds: batch,
            });
        }
    } catch (err) {
        console.error('Failed to send nearby event notifications:', err);
    }
}
