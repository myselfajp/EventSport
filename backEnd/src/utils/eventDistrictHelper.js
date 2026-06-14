import Facility from '../models/facilityModel.js';
import Salon from '../models/salonModel.js';
import User from '../models/userModel.js';
import Follow from '../models/followModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import { District } from '../models/locationModel.js';
import { AppError } from '../utils/appError.js';
import { buildLocationKey, resolveIstanbulDistrictId } from './locationHelper.js';
import {
    notifyNearbyEventCreated,
    notifyCoachFollowersOfEvent,
    notifyClubFollowersOfEvent,
    notifyClubGroupFollowersOfEvent,
    notifyFacilityFollowersOfEvent,
    notifyFacilityOwnerNewEvent,
} from './notificationHelper.js';

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
        'The selected facility has no Istanbul district configured. Edit the facility to add a district, or select a district for this event.'
    );
}

/**
 * Resolve the full location of an event (multi-country aware).
 * Returns { district (Istanbul ObjectId|null), country, state, city, districtName, locationKey }.
 *
 * Priority:
 *  1) Online → empty.
 *  2) Manual Istanbul district / facility / salon → Istanbul ObjectId + tr:istanbul key.
 *  3) Explicit country/state/city/districtName (multi-country, no facility) → key from those.
 */
export async function resolveEventLocation({
    type,
    district,
    facility,
    salon,
    country,
    state,
    city,
    districtName,
}) {
    const empty = {
        district: null,
        country: '',
        state: '',
        city: '',
        districtName: '',
        locationKey: '',
    };
    if (type === 'Online') return empty;

    // 1) Istanbul District ObjectId from manual district / facility / salon.
    let istanbulDistrictId = null;
    if (district) {
        const exists = await District.exists({ _id: district });
        if (!exists) throw new AppError(400, 'Invalid district.');
        istanbulDistrictId = district;
    } else if (facility) {
        const doc = await Facility.findById(facility).select('location.district').lean();
        if (doc?.location?.district) istanbulDistrictId = doc.location.district;
    } else if (salon) {
        const doc = await Salon.findById(salon)
            .select('facility')
            .populate({ path: 'facility', select: 'location.district' })
            .lean();
        if (doc?.facility?.location?.district) istanbulDistrictId = doc.facility.location.district;
    }

    if (istanbulDistrictId) {
        const dDoc = await District.findById(istanbulDistrictId).select('name').lean();
        const loc = { country: 'TR', state: '', city: 'İstanbul', districtName: dDoc?.name || '' };
        return { district: istanbulDistrictId, ...loc, locationKey: buildLocationKey(loc) };
    }

    // 2) Explicit multi-country location fields (no facility/salon).
    const ctry = String(country || '').toUpperCase() === 'US' ? 'US' : country ? 'TR' : '';
    if (ctry) {
        const loc = {
            country: ctry,
            state: state || '',
            city: city || '',
            districtName: districtName || '',
        };
        const key = buildLocationKey(loc);
        if (key) {
            const linkedId =
                ctry === 'TR' ? await resolveIstanbulDistrictId(loc.city, loc.districtName) : null;
            return { district: linkedId, ...loc, locationKey: key };
        }
    }

    throw new AppError(
        400,
        'A location is required for non-online events. Select a facility/salon, or provide country, city and district.'
    );
}

const NOTIFY_BATCH_SIZE = 200;

/** Notify users in the same locality (locationKey) when a new physical event is created. */
export async function notifyUsersInEventDistrict(event, ownerUserId, coachName) {
    if (!event?.locationKey || event.type === 'Online' || event.private) return;

    try {
        const districtName = event.districtName || event.city || 'your area';

        const users = await User.find({
            'location.locationKey': event.locationKey,
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

/**
 * Notify followers of the event's club, club group, and/or facility.
 * Best-effort: errors are logged, never thrown.
 */
export async function notifyAffinityFollowersOfNewEvent(event, ownerUserId) {
    if (!event || event.private) return;

    try {
        // Club followers
        if (event.club) {
            try {
                const clubDoc = await Club.findById(event.club).select('name').lean();
                const followRows = await Follow.find({ followingClub: event.club })
                    .select('follower')
                    .lean();
                const userIds = [
                    ...new Set(
                        followRows
                            .map((r) => r.follower?.toString())
                            .filter(
                                (id) =>
                                    id && id !== ownerUserId?.toString()
                            )
                    ),
                ];
                if (userIds.length > 0) {
                    for (let i = 0; i < userIds.length; i += NOTIFY_BATCH_SIZE) {
                        await notifyClubFollowersOfEvent({
                            eventId: event._id.toString(),
                            eventName: event.name,
                            clubId: event.club.toString(),
                            clubName: clubDoc?.name || 'Club',
                            userIds: userIds.slice(i, i + NOTIFY_BATCH_SIZE),
                        });
                    }
                }
            } catch (err) {
                console.error('Club followers notification failed:', err);
            }
        }

        // Club Group followers
        if (event.group) {
            try {
                const groupDoc = await ClubGroup.findById(event.group).select('name').lean();
                const followRows = await Follow.find({ followingClubGroup: event.group })
                    .select('follower')
                    .lean();
                const userIds = [
                    ...new Set(
                        followRows
                            .map((r) => r.follower?.toString())
                            .filter(
                                (id) => id && id !== ownerUserId?.toString()
                            )
                    ),
                ];
                if (userIds.length > 0) {
                    for (let i = 0; i < userIds.length; i += NOTIFY_BATCH_SIZE) {
                        await notifyClubGroupFollowersOfEvent({
                            eventId: event._id.toString(),
                            eventName: event.name,
                            groupId: event.group.toString(),
                            groupName: groupDoc?.name || 'Group',
                            userIds: userIds.slice(i, i + NOTIFY_BATCH_SIZE),
                        });
                    }
                }
            } catch (err) {
                console.error('Group followers notification failed:', err);
            }
        }

        // Facility followers
        if (event.facility) {
            try {
                const facilityDoc = await Facility.findById(event.facility)
                    .select('name')
                    .lean();
                const followRows = await Follow.find({
                    followingFacility: event.facility,
                })
                    .select('follower')
                    .lean();
                const userIds = [
                    ...new Set(
                        followRows
                            .map((r) => r.follower?.toString())
                            .filter(
                                (id) => id && id !== ownerUserId?.toString()
                            )
                    ),
                ];
                if (userIds.length > 0) {
                    for (let i = 0; i < userIds.length; i += NOTIFY_BATCH_SIZE) {
                        await notifyFacilityFollowersOfEvent({
                            eventId: event._id.toString(),
                            eventName: event.name,
                            facilityId: event.facility.toString(),
                            facilityName: facilityDoc?.name || 'Facility',
                            userIds: userIds.slice(i, i + NOTIFY_BATCH_SIZE),
                        });
                    }
                }
            } catch (err) {
                console.error('Facility followers notification failed:', err);
            }
        }
    } catch (err) {
        console.error('notifyAffinityFollowersOfNewEvent failed:', err);
    }
}

/**
 * Notify the facility owner(s) when a new event is created at their facility.
 * Looks up users where `facility === event.facility` (assumed owner relation).
 * Best-effort.
 */
export async function notifyFacilityOwnerOfNewEvent(event, ownerUserId, coachName) {
    if (!event?.facility || event.private) return;
    try {
        const facilityDoc = await Facility.findById(event.facility)
            .select('name owner createdBy creator')
            .lean();
        if (!facilityDoc) return;

        const ownerCandidates = new Set();
        // Try common owner-style fields without making schema assumptions.
        const candidateRefs = [facilityDoc.owner, facilityDoc.createdBy, facilityDoc.creator]
            .filter(Boolean)
            .map(String);
        for (const id of candidateRefs) {
            if (id !== ownerUserId?.toString()) ownerCandidates.add(id);
        }

        // Also notify users that have facility = event.facility (their own facility).
        const facilityUsers = await User.find({
            facility: event.facility,
            isActive: { $ne: false },
            _id: { $ne: ownerUserId },
        })
            .select('_id')
            .lean();
        for (const u of facilityUsers) {
            ownerCandidates.add(u._id.toString());
        }

        const userIds = [...ownerCandidates];
        if (userIds.length === 0) return;

        await notifyFacilityOwnerNewEvent({
            ownerUserIds: userIds,
            eventId: event._id.toString(),
            eventName: event.name,
            facilityName: facilityDoc.name || 'your facility',
            coachName: coachName || 'A coach',
        });
    } catch (err) {
        console.error('notifyFacilityOwnerOfNewEvent failed:', err);
    }
}

/**
 * Notify every gamer who follows the coach (`user.coach`) of the just-created event.
 * Skips private events and self-notification. Best-effort: errors are logged, not thrown.
 */
export async function notifyCoachFollowersOfNewEvent(event, ownerUser, coachName) {
    if (!event || !ownerUser?.coach || event.private) return;

    try {
        const followRows = await Follow.find({ followingCoach: ownerUser.coach })
            .select('follower')
            .lean();

        const followerIds = followRows
            .map((row) => row.follower)
            .filter((id) => id && id.toString() !== ownerUser._id.toString())
            .map((id) => id.toString());

        if (followerIds.length === 0) return;

        const unique = [...new Set(followerIds)];

        for (let i = 0; i < unique.length; i += NOTIFY_BATCH_SIZE) {
            const batch = unique.slice(i, i + NOTIFY_BATCH_SIZE);
            await notifyCoachFollowersOfEvent({
                eventId: event._id.toString(),
                eventName: event.name,
                coachId: ownerUser.coach.toString(),
                coachName,
                userIds: batch,
            });
        }
    } catch (err) {
        console.error('Failed to send coach-follower notifications:', err);
    }
}
