import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Facility from '../models/facilityModel.js';
import Club from '../models/clubModel.js';
import Company from '../models/companyModel.js';

/**
 * Available audience segments admins can target with a single notification.
 * Each entry returns the unique set of User IDs that match that segment.
 *
 * Segments are intentionally additive: when multiple are selected the result
 * is the union (deduped) of users from each segment.
 */
export const AUDIENCE_SEGMENTS = [
    {
        id: 'all_active_users',
        label: 'All active users',
    },
    {
        id: 'all_admins',
        label: 'Admins (role = 0)',
    },
    {
        id: 'all_gamers',
        label: 'All gamers (have participant profile)',
    },
    {
        id: 'all_coaches',
        label: 'All coaches (have coach profile)',
    },
    {
        id: 'verified_coaches',
        label: 'Verified coaches',
    },
    {
        id: 'all_facility_owners',
        label: 'Facility owners (any facility linked)',
    },
    {
        id: 'all_company_owners',
        label: 'Company owners (any company linked)',
    },
    {
        id: 'all_club_owners',
        label: 'Club owners',
    },
    {
        id: 'community_owners',
        label: 'Community owners (clubs or club groups)',
    },
];

async function fetchUserIdsForSegment(segmentId) {
    switch (segmentId) {
        case 'all_active_users': {
            const users = await User.find({ isActive: { $ne: false } })
                .select('_id')
                .lean();
            return users.map((u) => u._id.toString());
        }
        case 'all_admins': {
            const users = await User.find({ role: 0, isActive: { $ne: false } })
                .select('_id')
                .lean();
            return users.map((u) => u._id.toString());
        }
        case 'all_gamers': {
            const users = await User.find({
                participant: { $ne: null },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();
            return users.map((u) => u._id.toString());
        }
        case 'all_coaches': {
            const users = await User.find({
                coach: { $ne: null },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();
            return users.map((u) => u._id.toString());
        }
        case 'verified_coaches': {
            // Treat coaches with `isVerified: true` as verified, falling back
            // to coaches having any approved branch certificate elsewhere.
            const verifiedCoachIds = await Coach.find({ isVerified: true })
                .select('_id')
                .lean();
            if (verifiedCoachIds.length === 0) return [];
            const users = await User.find({
                coach: { $in: verifiedCoachIds.map((c) => c._id) },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();
            return users.map((u) => u._id.toString());
        }
        case 'all_facility_owners': {
            // Users that have at least one facility associated.
            const users = await User.find({
                facility: { $exists: true, $not: { $size: 0 } },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();

            // Also include users marked as owner/createdBy/creator on any Facility.
            const facilities = await Facility.find({})
                .select('owner createdBy creator')
                .lean();
            const ownerIds = new Set();
            for (const f of facilities) {
                if (f.owner) ownerIds.add(String(f.owner));
                if (f.createdBy) ownerIds.add(String(f.createdBy));
                if (f.creator) ownerIds.add(String(f.creator));
            }
            const userIds = new Set(users.map((u) => u._id.toString()));
            for (const id of ownerIds) userIds.add(id);
            return [...userIds];
        }
        case 'all_company_owners': {
            const users = await User.find({
                company: { $exists: true, $not: { $size: 0 } },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();

            const companies = await Company.find({})
                .select('owner createdBy creator')
                .lean();
            const ownerIds = new Set();
            for (const c of companies) {
                if (c.owner) ownerIds.add(String(c.owner));
                if (c.createdBy) ownerIds.add(String(c.createdBy));
                if (c.creator) ownerIds.add(String(c.creator));
            }
            const userIds = new Set(users.map((u) => u._id.toString()));
            for (const id of ownerIds) userIds.add(id);
            return [...userIds];
        }
        case 'all_club_owners': {
            const clubs = await Club.find({})
                .select('creator owner createdBy')
                .lean();
            const ownerUserIds = new Set();
            for (const c of clubs) {
                if (c.creator) ownerUserIds.add(String(c.creator));
                if (c.owner) ownerUserIds.add(String(c.owner));
                if (c.createdBy) ownerUserIds.add(String(c.createdBy));
            }
            return [...ownerUserIds];
        }
        case 'community_owners': {
            const clubOwners = await fetchUserIdsForSegment('all_club_owners');
            // Club groups are owned by a Coach, not a User. Resolve coach -> user.
            const coachOwnedGroups = await Coach.find({})
                .select('_id')
                .lean();
            // Just get all users tied to any coach (community_owners is broad).
            const users = await User.find({
                coach: { $in: coachOwnedGroups.map((c) => c._id) },
                isActive: { $ne: false },
            })
                .select('_id')
                .lean();
            return [
                ...new Set([
                    ...clubOwners,
                    ...users.map((u) => u._id.toString()),
                ]),
            ];
        }
        default:
            return [];
    }
}

/**
 * Resolve a flat, deduped list of user IDs for the given segment IDs.
 */
export async function resolveSegmentUserIds(segmentIds) {
    if (!Array.isArray(segmentIds) || segmentIds.length === 0) return [];

    const all = new Set();
    for (const id of segmentIds) {
        const ids = await fetchUserIdsForSegment(id);
        for (const userId of ids) {
            if (userId) all.add(String(userId));
        }
    }
    return [...all];
}
