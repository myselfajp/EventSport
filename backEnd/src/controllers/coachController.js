import { AppError } from '../utils/appError.js';
import { ObjectId } from 'mongodb';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Event from '../models/eventModel.js';
import Branch from '../models/branchModel.js';
import Club from '../models/clubModel.js';
import ClubGroup from '../models/clubGroupModel.js';
import Salon from '../models/salonModel.js';
import Facility from '../models/facilityModel.js';
import Invite from '../models/inviteModel.js';
import Reservation from '../models/reservationModel.js';
import { Sport, EventStyle, SportGroup } from '../models/referenceDataModel.js';
import { JoinPrivateEvent, JoinClub, JoinGroup } from '../models/joinRequestModel.js';
import EventEndPhoto from '../models/eventEndPhotoModel.js';
import Follow from '../models/followModel.js';
import { genSecret } from '../utils/secretIdGen.js';
import * as zodValidation from '../utils/validation.js';
import { unlink } from 'fs/promises';
import {
    recordLegalAcceptance,
    recordMarketingConsent,
    recordCoachProfileLegalAcceptances,
} from '../utils/contractAcceptanceHelper.js';
import { mergeLocationIntoPayload } from '../utils/entityLocation.js';
import {
    resolveEventLocation,
    notifyUsersInEventDistrict,
    notifyCoachFollowersOfNewEvent,
    notifyAffinityFollowersOfNewEvent,
    notifyFacilityOwnerOfNewEvent,
} from '../utils/eventDistrictHelper.js';
import { createRecurringEventSeries, cancelEventsWithScope, applyEventEditWithScope } from '../utils/eventSeriesService.js';
import { getListingPricePerSlot } from '../utils/recurrenceHelper.js';
import EventSeries from '../models/eventSeriesModel.js';
import {
    notifyReservedUsersEventCancelled,
    notifyReservedUsersEventUpdated,
} from '../utils/eventReservationNotifier.js';
import {
    notifyEventInvite,
    notifyGroupInvite,
    notifyJoinRequestApproved,
} from '../utils/notificationHelper.js';

/** Build a short human-readable summary of which event fields changed. */
function summarizeEventChanges(prev, next) {
    const parts = [];
    if (next?.startTime !== undefined && prev?.startTime) {
        const a = new Date(prev.startTime).getTime();
        const b = new Date(next.startTime).getTime();
        if (a !== b) parts.push('time');
    }
    if (next?.endTime !== undefined && prev?.endTime) {
        const a = new Date(prev.endTime).getTime();
        const b = new Date(next.endTime).getTime();
        if (a !== b && !parts.includes('time')) parts.push('time');
    }
    const refKeys = ['facility', 'salon', 'district'];
    for (const key of refKeys) {
        if (next?.[key] !== undefined) {
            const prevVal = prev?.[key]?.toString?.() ?? prev?.[key] ?? null;
            const nextVal = next?.[key]?.toString?.() ?? next?.[key] ?? null;
            if (String(prevVal) !== String(nextVal)) {
                parts.push('location');
                break;
            }
        }
    }
    if (next?.type !== undefined && next.type !== prev?.type) {
        if (!parts.includes('location')) parts.push('location');
    }
    if (next?.name !== undefined && next.name !== prev?.name) {
        parts.push('title');
    }
    if (next?.capacity !== undefined && next.capacity !== prev?.capacity) {
        parts.push('capacity');
    }
    if (
        next?.participationFee !== undefined &&
        next.participationFee !== prev?.participationFee
    ) {
        parts.push('fee');
    }
    if (next?.eventDetails !== undefined && next.eventDetails !== prev?.eventDetails) {
        parts.push('details');
    }
    if (parts.length === 0) return undefined;
    return `Updated: ${parts.join(', ')}.`;
}

function buildEditNotificationSummary(prev, updateData) {
    return (
        summarizeEventChanges(prev, updateData) ||
        'The organizer updated this event. Please review the latest details.'
    );
}

export const createBranch = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const user = req.user;
        const {
            branches: result,
            agreeCoachAgreement,
            marketingConsent,
            commercialMessagesVersionId,
        } = zodValidation.parseCoachProfileFormData(req.body.data);

        const isFirstCoachProfile = !user.coach;
        if (isFirstCoachProfile && agreeCoachAgreement !== true) {
            throw new AppError(400, 'You must accept the Trainer Agreement.');
        }

        // Separate branches by certificate presence (infer behavior)
        const branchesNeedingPhotos = result.filter((branch) => !branch.certificate); // no certificate = need upload

        // Validate photo requirements for new uploads
        if (branchesNeedingPhotos.length > 0 && !req.fileMeta) {
            throw new AppError(400, 'No certificates uploaded for branches requiring photos');
        }

        if (branchesNeedingPhotos.length !== (req.fileMeta?.length || 0)) {
            throw new AppError(
                400,
                'Number of uploaded photos and branches requiring photos do not match'
            );
        }

        // Get or create coach
        let coach = user.coach;
        if (!coach) {
            coach = await Coach.create({
                name: `${user.firstName} ${user.lastName}`,
            });
            const addToUser = await User.findByIdAndUpdate(
                user._id,
                { coach: coach._id },
                { new: true }
            );
            if (!addToUser) throw new AppError(404);
        }

        // Validate no duplicates in request
        const branchOrders = result.map((c) => c.branchOrder);
        const sports = result.map((c) => c.sport);

        if (branchOrders.length !== new Set(branchOrders).size) {
            throw new AppError(400, 'Duplicate branchOrder in request');
        }
        if (sports.length !== new Set(sports).size) {
            throw new AppError(400, 'Duplicate sport in request');
        }

        // Process and validate all branches
        const processedBranches = await Promise.all(
            result.map(async (branchData) => {
                // Verify sport exists
                const sportExists = await Sport.findById(branchData.sport);
                if (!sportExists) throw new AppError(404, `Sport not found: ${branchData.sport}`);

                let certificate;

                if (!branchData.certificate) {
                    // No certificate in data = need to use uploaded file
                    const file = req.fileMeta.find((f) => {
                        const match = f.originalName.match(/sportId=([0-9a-f]{24})/i);
                        return (
                            match &&
                            String(match[1]).toLowerCase() ===
                            String(branchData.sport).toLowerCase()
                        );
                    });

                    if (!file) {
                        throw new AppError(
                            400,
                            `No certificate uploaded for sport ${branchData.sport}`
                        );
                    }

                    certificate = file;
                } else {
                    // Certificate exists in data = use existing certificate
                    if (!branchData.certificate.originalName) {
                        throw new AppError(
                            400,
                            `Certificate originalName required for sport ${branchData.sport}`
                        );
                    }

                    // Validate that certificate matches sportId
                    const match =
                        branchData.certificate.originalName.match(/sportId=([0-9a-f]{24})/i);
                    if (
                        !match ||
                        String(match[1]).toLowerCase() !== String(branchData.sport).toLowerCase()
                    ) {
                        throw new AppError(
                            400,
                            `Certificate originalName does not match sport ID for sport ${branchData.sport}`
                        );
                    }

                    certificate = branchData.certificate;
                }

                return { ...branchData, certificate };
            })
        );

        // Get all existing branches for this coach
        const existingBranches = await Branch.find({ coach: coach._id });

        // Delete certificate files ONLY for branches that need new photos (no certificate in data)
        const sportsNeedingNewPhotos = branchesNeedingPhotos.map((b) => b.sport);
        for (const branch of existingBranches) {
            if (
                sportsNeedingNewPhotos.includes(branch.sport.toString()) &&
                branch.certificate?.path
            ) {
                try {
                    await unlink(branch.certificate.path);
                    console.log(`Deleted old certificate file: ${branch.certificate.path}`);
                } catch (err) {
                    console.warn(
                        `Failed to delete old certificate file: ${branch.certificate.path}`,
                        err
                    );
                }
            }
        }

        // Delete ALL existing branches for this coach
        await Branch.deleteMany({ coach: coach._id });

        // Create all new branches
        const newBranches = await Branch.insertMany(
            processedBranches.map((branch) => ({ coach: coach._id, ...branch }))
        );

        if (isFirstCoachProfile && typeof marketingConsent === 'boolean') {
            await User.findByIdAndUpdate(user._id, {
                marketingConsent: {
                    agreed: marketingConsent,
                    consentedAt: marketingConsent ? new Date() : null,
                },
            });
        }

        if (isFirstCoachProfile && agreeCoachAgreement === true) {
            await recordCoachProfileLegalAcceptances(req, user._id, 'coach_profile');
            if (typeof marketingConsent === 'boolean') {
                if (marketingConsent && commercialMessagesVersionId) {
                    await recordLegalAcceptance(req, user._id, {
                        versionId: commercialMessagesVersionId,
                        expectedDocType: 'commercial_messages',
                        context: 'coach_profile',
                    });
                } else if (marketingConsent) {
                    await recordMarketingConsent(req, user._id, marketingConsent, 'coach_profile');
                }
            }
        }

        res.status(201).json({
            success: true,
            message: 'Coach/Branch created successfully',
            data: newBranches,
        });
    } catch (err) {
        // CLEANUP ORPHAN FILES ON ERROR
        if (req.fileMeta && req.fileMeta.length > 0) {
            console.warn('Error occurred, cleaning up uploaded files...');
            for (const file of req.fileMeta) {
                try {
                    await unlink(file.path);
                    console.warn(`Cleaned up orphan file: ${file.path}`);
                } catch (unlinkErr) {
                    console.error(`Failed to cleanup orphan file: ${file.path}`, unlinkErr);
                }
            }
        }
        next(err);
    }
};

export const currentBranches = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }
        if (!req.user.coach && req.user.role !== 0) {
            throw new AppError(403);
        }
        if (!req.user.coach) {
            return res.status(200).json({
                success: true,
                data: [],
            });
        }

        const user = req.user;

        const branches = await Branch.find({ coach: user.coach })
            .sort({ branchOrder: 1 })
            .populate({
                path: 'sport',
                select: 'name groupName icon coachBadge',
            })
            .lean();
        if (!branches) throw new AppError(404, 'This branch does not exist');
        const result = branches.map((branch) => ({
            ...branch,
            sportName: branch.sport?.name,
            sportGroup: branch.sport?.groupName,
            sport: branch.sport?._id,
            sportIcon: branch.sport?.icon ?? null,
            sportCoachBadge: branch.sport?.coachBadge ?? null,
        }));

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (err) {
        next(err);
    }
};

export const createEvent = async (req, res, next) => {
    try {
        if (Object.keys(req.fileMeta).length !== 2)
            throw new AppError(400, 'Both event banner and event photo is required');
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = JSON.parse(req.body.data);
        const user = req.user;

        // get dates if provided
        if (data.startTime) {
            data.startTime = new Date(data.startTime);
        }
        if (data.endTime) {
            data.endTime = new Date(data.endTime);
        }

        const result = zodValidation.createEventPayloadSchema.parse(data ?? {});

        const { recurrence, listingPurchaseConfirmed, ...eventFields } = result;

        // Convert empty strings to undefined for optional fields
        if (eventFields.club === '') eventFields.club = undefined;
        if (eventFields.group === '') eventFields.group = undefined;

        const checks = [
            ...(eventFields.club ? [{ id: eventFields.club, model: Club, name: 'Club' }] : []),
            ...(eventFields.group ? [{ id: eventFields.group, model: ClubGroup, name: 'ClubGroup' }] : []),
            { id: eventFields.sportGroup, model: SportGroup, name: 'SportGroup' },
            { id: eventFields.sport, model: Sport, name: 'sport' },
            ...(eventFields.salon ? [{ id: eventFields.salon, model: Salon, name: 'Salon' }] : []),
            ...(eventFields.facility
                ? [{ id: eventFields.facility, model: Facility, name: 'Facility' }]
                : []),
        ];

        const models = await Promise.all(
            checks.map(async ({ id, model, name }) => {
                const exists = await model.exists({ _id: new ObjectId(id) });
                return { name, exists: Boolean(exists) };
            })
        );

        const allValid = models.every((r) => r.exists);
        if (!allValid) {
            const notFound = models.filter((r) => !r.exists).map((r) => r.name);
            throw new AppError(404, `${notFound.join(', ')} not found`);
        }

        // Fetch EventStyle to populate eventStyle field
        const eventStyleData = await EventStyle.findById(eventFields.style);
        if (!eventStyleData) {
            throw new AppError(404, 'EventStyle not found');
        }
        eventFields.eventStyle = {
            name: eventStyleData.name,
            color: eventStyleData.color,
        };

        if (eventFields.private && eventFields.private === true) {
            eventFields.secretId = genSecret();
        }

        if (eventFields.priceType === 'Free') {
            eventFields.participationFee = 0;
        }

        // insert photos to result object
        eventFields.banner = req.fileMeta['event-banner'][0];
        eventFields.photo = req.fileMeta['event-photo'][0];

        const resolvedLoc = await resolveEventLocation({
            type: eventFields.type,
            district: eventFields.district,
            facility: eventFields.facility,
            salon: eventFields.salon,
            country: eventFields.country,
            state: eventFields.state,
            city: eventFields.city,
            districtName: eventFields.districtName,
        });
        eventFields.district = resolvedLoc.district;
        eventFields.country = resolvedLoc.country;
        eventFields.state = resolvedLoc.state;
        eventFields.city = resolvedLoc.city;
        eventFields.districtName = resolvedLoc.districtName;
        eventFields.locationKey = resolvedLoc.locationKey;

        if (eventFields.isRecurring && recurrence) {
            const seriesResult = await createRecurringEventSeries({
                user,
                eventPayload: eventFields,
                recurrence,
                listingPurchaseConfirmed,
            });

            const firstEvent = seriesResult.events[0]?.toObject?.() ?? seriesResult.events[0];
            if (firstEvent?.secretId) delete firstEvent.secretId;

            return res.status(201).json({
                success: true,
                message: `Recurring series created with ${seriesResult.events.length} sessions`,
                data: firstEvent,
                series: seriesResult.series,
                sessions: seriesResult.events.map((e) => {
                    const o = e.toObject ? e.toObject() : e;
                    delete o.secretId;
                    return o;
                }),
                listing: seriesResult.listingSummary,
            });
        }

        const createEvent = await Event.create({ owner: user._id, ...eventFields, isRecurring: false });
        if (!createEvent) throw new AppError(500);
        const { secretId, ...event } = createEvent.toObject();

        const coachName =
            user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'A coach';
        void notifyUsersInEventDistrict(createEvent, user._id, coachName);
        void notifyCoachFollowersOfNewEvent(createEvent, user, coachName);
        void notifyAffinityFollowersOfNewEvent(createEvent, user._id);
        void notifyFacilityOwnerOfNewEvent(createEvent, user._id, coachName);

        res.status(201).json({
            success: true,
            message: 'Event created successfully',
            data: event,
        });
    } catch (err) {
        next(err);
    }
};

export const editEvent = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const eventId = zodValidation.mongoObjectId.parse(req.params.eventId);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (!eventExists.owner.equals(user._id)) {
            throw new AppError(403, 'Only the event creator can edit this event');
        }

        if (eventExists.status === 'cancelled') {
            throw new AppError(400, 'Cancelled events cannot be edited');
        }

        const data = req.body.data ? JSON.parse(req.body.data) : req.body;

        if (data.startTime) {
            data.startTime = new Date(data.startTime);
        }
        if (data.endTime) {
            data.endTime = new Date(data.endTime);
        }

        const result = zodValidation.editEventSchema.parse(data ?? {});

        // Empty strings from the form must not be written to ObjectId fields (CastError → "Not found")
        for (const key of ['club', 'group', 'facility', 'salon', 'district']) {
            if (result[key] === '') {
                result[key] = null;
            }
        }

        const updateData = {};

        // Check if referenced data exists
        if (result.sportGroup || result.sport || result.club || result.group || result.style) {
            const checks = [];
            if (result.club) checks.push({ id: result.club, model: Club, name: 'Club' });
            if (result.group) checks.push({ id: result.group, model: ClubGroup, name: 'ClubGroup' });
            if (result.sportGroup) checks.push({ id: result.sportGroup, model: SportGroup, name: 'SportGroup' });
            if (result.sport) checks.push({ id: result.sport, model: Sport, name: 'Sport' });
            if (result.style) checks.push({ id: result.style, model: EventStyle, name: 'EventStyle' });
            if (result.salon) checks.push({ id: result.salon, model: Salon, name: 'Salon' });
            if (result.facility) checks.push({ id: result.facility, model: Facility, name: 'Facility' });

            if (checks.length > 0) {
                const models = await Promise.all(
                    checks.map(async ({ id, model, name }) => {
                        const exists = await model.exists({ _id: new ObjectId(id) });
                        return { name, exists: Boolean(exists) };
                    })
                );

                const allValid = models.every((r) => r.exists);
                if (!allValid) {
                    const notFound = models.filter((r) => !r.exists).map((r) => r.name);
                    throw new AppError(404, `${notFound.join(', ')} not found`);
                }
            }
        }

        // Update eventStyle if style is provided
        if (result.style) {
            const eventStyleData = await EventStyle.findById(result.style);
            if (!eventStyleData) {
                throw new AppError(404, 'EventStyle not found');
            }
            updateData.eventStyle = {
                name: eventStyleData.name,
                color: eventStyleData.color,
            };
        }

        // Handle photos if provided
        if (req.fileMeta && Object.keys(req.fileMeta).length > 0) {
            if (req.fileMeta['event-banner']) {
                const bannerData = Array.isArray(req.fileMeta['event-banner']) 
                    ? req.fileMeta['event-banner'][0] 
                    : req.fileMeta['event-banner'];
                updateData.banner = bannerData;
            }
            if (req.fileMeta['event-photo']) {
                const photoData = Array.isArray(req.fileMeta['event-photo']) 
                    ? req.fileMeta['event-photo'][0] 
                    : req.fileMeta['event-photo'];
                updateData.photo = photoData;
            }
        }

        // Handle private/secretId
        if (result.private !== undefined) {
            if (result.private && result.private === true && !eventExists.secretId) {
                updateData.secretId = genSecret();
            } else if (!result.private && eventExists.secretId) {
                updateData.secretId = null;
            }
        }

        // Handle priceType
        if (result.priceType === 'Free') {
            updateData.participationFee = 0;
        }

        // Merge all update data
        Object.assign(updateData, result);
        delete updateData.style; // Remove style as we use eventStyle

        const effectiveType = result.type ?? eventExists.type;
        const effectiveFacility =
            result.facility !== undefined ? result.facility : eventExists.facility;
        const effectiveSalon = result.salon !== undefined ? result.salon : eventExists.salon;

        if (
            result.type !== undefined ||
            result.district !== undefined ||
            result.facility !== undefined ||
            result.salon !== undefined ||
            result.country !== undefined ||
            result.state !== undefined ||
            result.city !== undefined ||
            result.districtName !== undefined
        ) {
            if (effectiveType === 'Online') {
                updateData.district = null;
                updateData.country = '';
                updateData.state = '';
                updateData.city = '';
                updateData.districtName = '';
                updateData.locationKey = '';
            } else {
                const resolvedLoc = await resolveEventLocation({
                    type: effectiveType,
                    district: result.district ?? eventExists.district,
                    facility: effectiveFacility || undefined,
                    salon: effectiveSalon || undefined,
                    country: result.country ?? eventExists.country,
                    state: result.state ?? eventExists.state,
                    city: result.city ?? eventExists.city,
                    districtName: result.districtName ?? eventExists.districtName,
                });
                updateData.district = resolvedLoc.district;
                updateData.country = resolvedLoc.country;
                updateData.state = resolvedLoc.state;
                updateData.city = resolvedLoc.city;
                updateData.districtName = resolvedLoc.districtName;
                updateData.locationKey = resolvedLoc.locationKey;
            }
        }

        const scope = zodValidation.eventEditScopeSchema.parse(data.scope ?? 'single');

        if (eventExists.series && scope === 'following') {
            const seriesOutcome = await applyEventEditWithScope(
                eventExists,
                updateData,
                scope
            );
            const updatedEvent = await Event.findById(eventId).select('-secretId');
            const timeChanged =
                updateData.startTime !== undefined ||
                updateData.endTime !== undefined;
            const hasNonTimeUpdate = Object.keys(updateData).some(
                (k) => !['startTime', 'endTime', 'scope'].includes(k)
            );
            // Time-only series edits already trigger series_sessions_rescheduled inside applyEventEditWithScope.
            if (hasNonTimeUpdate) {
                const summary = buildEditNotificationSummary(
                    eventExists.toObject(),
                    updateData
                );
                for (const affectedId of seriesOutcome?.eventIds ?? [eventId]) {
                    const ev = await Event.findById(affectedId).select('name').lean();
                    void notifyReservedUsersEventUpdated({
                        eventId: affectedId,
                        eventName: ev?.name ?? updatedEvent?.name,
                        changeSummary: summary,
                    });
                }
            } else if (!timeChanged) {
                void notifyReservedUsersEventUpdated({
                    eventId: updatedEvent._id,
                    eventName: updatedEvent.name,
                    changeSummary: buildEditNotificationSummary(
                        eventExists.toObject(),
                        updateData
                    ),
                });
            }
            return res.status(200).json({
                success: true,
                message: 'Event series updated (this and following sessions)',
                data: updatedEvent,
                scope,
            });
        }

        const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            { $set: updateData },
            { new: true }
        ).select('-secretId');

        if (!updatedEvent) throw new AppError(404, 'Event not found');

        // Best-effort: notify joined gamers whenever the event is edited.
        void notifyReservedUsersEventUpdated({
            eventId: updatedEvent._id,
            eventName: updatedEvent.name,
            changeSummary: buildEditNotificationSummary(
                eventExists.toObject(),
                updateData
            ),
        });

        res.status(200).json({
            success: true,
            message: 'Event updated successfully',
            data: updatedEvent,
        });
    } catch (err) {
        next(err);
    }
};

export const cancelEvent = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const eventId = zodValidation.mongoObjectId.parse(req.params.eventId);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (!eventExists.owner.equals(user._id)) {
            throw new AppError(403, 'Only the event creator can cancel this event');
        }

        if (eventExists.status === 'cancelled') {
            throw new AppError(400, 'Event is already cancelled');
        }

        const scope = zodValidation.eventEditScopeSchema.parse(req.body?.scope ?? 'single');

        if (eventExists.series) {
            const outcome = await cancelEventsWithScope(eventExists, scope, user._id);
            return res.status(200).json({
                success: true,
                message:
                    scope === 'following'
                        ? 'This and following sessions cancelled'
                        : 'Event cancelled successfully',
                scope,
                ...outcome,
            });
        }

        const updated = await Event.findByIdAndUpdate(
            eventId,
            { status: 'cancelled', cancelledAt: new Date() },
            { new: true }
        );

        // Best-effort: notify reserved users that the event was cancelled.
        void notifyReservedUsersEventCancelled({
            eventId: updated?._id,
            eventName: updated?.name,
        });

        res.status(200).json({
            success: true,
            message: 'Event cancelled successfully',
            data: updated,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteEvent = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }

        const user = req.user;
        const eventId = zodValidation.mongoObjectId.parse(req.params.eventId);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');
        
        if (!eventExists.owner.equals(user._id)) {
            throw new AppError(403, 'Only the event creator can delete this event');
        }

        await Event.findByIdAndDelete(eventId);

        res.status(204).json({
            success: true,
            message: 'Event deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const joinBackupCoach = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.mongoObjectId.parse(req.params?.eventId);

        const eventExists = await Event.findById(result);
        if (!eventExists) throw new AppError(404, 'This Event does not exist');

        if (eventExists.backupCoach) throw new AppError(409, 'Backup coach already exists');
        if (eventExists.owner?.equals(user._id))
            throw new AppError(403, 'You are already a coach in this event');

        const addToEvent = await Event.findByIdAndUpdate(
            result,
            { backupCoach: user._id },
            { new: true }
        );
        if (!addToEvent) throw new AppError(404);

        res.status(201).json({
            success: true,
            message: 'Backup coach joined successfully',
            data: addToEvent,
        });
    } catch (err) {
        next(err);
    }
};

export const createGroup = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const rawData = JSON.parse(req.body.data);
        let ownerCoach = user.coach;

        if (user.role === 0 && !user.coach) {
            const oid = rawData.ownerCoachId;
            delete rawData.ownerCoachId;
            ownerCoach = zodValidation.mongoObjectId.parse(oid);
            const coachExists = await Coach.exists({ _id: ownerCoach });
            if (!coachExists) throw new AppError(404, 'Coach not found');
        }

        const result = zodValidation.createGroupSchema.parse(rawData);
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        if (!result.mainSport && clubExists.mainSport) {
            result.mainSport = clubExists.mainSport;
        }
        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const groupPayload = await mergeLocationIntoPayload(result);
        const createGroup = await ClubGroup.create({
            owner: ownerCoach,
            clubId,
            clubName: clubExists.name,
            ...groupPayload,
            isApproved: true,
        });

        res.status(201).json({
            success: true,
            message: 'Group created successfully',
            data: createGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const editGroup = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);

        if (req.fileMeta) {
            data.photo = req.fileMeta;
        }

        const result = zodValidation.editGroupSchema.parse(data);
        const groupId = zodValidation.mongoObjectId.parse(req.params.groupId);

        const groupExists = await ClubGroup.findById(groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');
        if (!(groupExists.owner.equals(user.coach) || user.role === 0))
            throw new AppError(403, 'You are not group creator');

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }
        const groupUpdate = await mergeLocationIntoPayload(result);
        const editGroup = await ClubGroup.findByIdAndUpdate(groupId, { ...groupUpdate }, { new: true });

        res.status(201).json({
            success: true,
            message: 'Group edited successfully',
            data: editGroup,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteGroup = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const groupId = zodValidation.mongoObjectId.parse(req.params.groupId);

        const groupExists = await ClubGroup.findById(groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');
        if (!(groupExists.owner.equals(user.coach) || user.role === 0)) {
            throw new AppError(403, 'You are not group creator');
        }

        await ClubGroup.findByIdAndDelete(groupId);

        res.status(204).json({
            success: true,
            message: 'Group deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const createClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);
        const result = zodValidation.createClubSchema.parse(data);

        // check for president
        if (result.president) {
            const exists = await User.exists({ _id: new ObjectId(result.president) });
            if (!exists) throw new AppError(404, 'President not found');
        }

        // check for coaches array
        if (result.coaches.length > 0) {
            const checks = await Promise.all(
                result.coaches.map(async (id) => {
                    const exists = await User.exists({ _id: new ObjectId(id) });
                    return { id, exists: Boolean(exists) };
                })
            );
            const allValid = checks.every((r) => r.exists);
            if (!allValid) {
                const notFound = checks.filter((r) => !r.exists).map((r) => r.id);
                throw new AppError(404, `User with id: ${notFound.join(', ')} not found`);
            }
        }

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const clubPayload = await mergeLocationIntoPayload(result);
        const createClub = await Club.create({
            creator: user._id,
            ...clubPayload,
            isApproved: true,
        });

        res.status(201).json({
            success: true,
            message: 'Club created successfully',
            data: createClub,
        });
    } catch (err) {
        next(err);
    }
};

export const editClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const data = JSON.parse(req.body.data);
        const result = zodValidation.editClubSchema.parse(data);
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        // check for club
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        // check for ownership
        if (!(clubExists.creator.equals(user._id) || user.role === 0))
            throw new AppError(403, 'You are not Club creator');

        // check for president
        if (result.president) {
            const exists = await User.exists({ _id: new ObjectId(result.president) });
            if (!exists) throw new AppError(404, 'President not found');
        }

        // check for coaches array
        if (result.coaches.length > 0) {
            const checks = await Promise.all(
                result.coaches.map(async (id) => {
                    const exists = await User.exists({ _id: new ObjectId(id) });
                    return { id, exists: Boolean(exists) };
                })
            );
            const allValid = checks.every((r) => r.exists);
            if (!allValid) {
                const notFound = checks.filter((r) => !r.exists).map((r) => r.id);
                throw new AppError(404, `User with id: ${notFound.join(', ')} not found`);
            }
        }

        if (result.mainSport) {
            const sportExists = await Sport.exists({ _id: result.mainSport });
            if (!sportExists) throw new AppError(404, 'MainSport not found');
        }

        if (req.fileMeta) {
            result.photo = req.fileMeta;
        }

        const clubUpdate = await mergeLocationIntoPayload(result);
        const editClub = await Club.findByIdAndUpdate(clubId, { ...clubUpdate }, { new: true });

        res.status(201).json({
            success: true,
            message: 'Club edited successfully',
            data: editClub,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const clubId = zodValidation.mongoObjectId.parse(req.params.clubId);

        // check for club
        const clubExists = await Club.findById(clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        // check for ownership
        if (!(clubExists.creator.equals(user._id) || user.role === 0))
            throw new AppError(403, 'You are not Club creator');

        await Club.findByIdAndDelete(clubId);

        res.status(204).json({
            success: true,
            message: 'Club deleted successfully',
            data: deleteClub,
        });
    } catch (err) {
        next(err);
    }
};

// join requests

export const approveJoinGroup = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinGroupSchema.parse(req.body);

        const groupExists = await ClubGroup.findById(result.groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!groupExists.isApproved) {
            throw new AppError(403, 'Group is not approved');
        }

        if (!groupExists.owner.equals(user.coach) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        const approve = await JoinGroup.findOneAndUpdate(
            { userId: result.userId, groupId: result.groupId },
            {
                isApproved: true,
            }
        );
        if (!approve) throw new AppError(404, 'Join request not found');

        void notifyJoinRequestApproved({
            userId: result.userId,
            requestType: 'group',
            targetName: groupExists.name,
        }).catch((err) => console.error('notifyJoinRequestApproved (group) failed:', err));

        res.status(201).json({
            success: true,
            message: 'Joined to group successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const approveJoinClub = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinClubSchema.parse(req.body);

        const clubExists = await Club.findById(result.clubId);
        if (!clubExists) throw new AppError(404, 'Club not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!clubExists.isApproved) {
            throw new AppError(403, 'Club is not approved');
        }

        if (!clubExists.creator.equals(user._id) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        const approve = await JoinClub.findOneAndUpdate(
            { userId: result.userId, clubId: result.clubId },
            {
                isApproved: true,
            }
        );
        if (!approve) throw new AppError(404, 'Join request not found');

        void notifyJoinRequestApproved({
            userId: result.userId,
            requestType: 'club',
            targetName: clubExists.name,
        }).catch((err) => console.error('notifyJoinRequestApproved (club) failed:', err));

        res.status(201).json({
            success: true,
            message: 'Joined to club successfully',
        });
    } catch (err) {
        next(err);
    }
};

// invite requests
export const inviteGroup = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinGroupSchema.parse(req.body);

        const groupExists = await ClubGroup.findById(result.groupId);
        if (!groupExists) throw new AppError(404, 'Group not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (!groupExists.isApproved) {
            throw new AppError(403, 'Group is not approved');
        }

        if (!groupExists.owner.equals(user.coach) && user.role !== 0) {
            throw new AppError(403, 'You are not the owner');
        }

        const inviterCoach =
            user.coach || (user.role === 0 ? groupExists.owner : null);
        if (!inviterCoach) {
            throw new AppError(400, 'Cannot record invitation without a coach profile.');
        }

        // check if already invited to this group
        const alreadyInvited = await Invite.exists({
            invitee: result.userId,
            group: result.groupId,
        });
        if (alreadyInvited) throw new AppError(409, 'You already invited this user.');

        const invite = await Invite.create({
            inviter: inviterCoach,
            invitee: result.userId,
            group: result.groupId,
        });

        const inviterName =
            user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'Someone';
        void notifyGroupInvite({
            userId: result.userId,
            groupId: String(groupExists._id),
            groupName: groupExists.name,
            inviterName,
        }).catch((err) =>
            console.error('notifyGroupInvite failed:', err)
        );

        res.status(201).json({
            success: true,
            message: 'Invited to group successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const inviteEvent = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const user = req.user;
        const result = zodValidation.joinEventSchema.parse(req.body);

        const eventExists = await Event.findById(result.eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        const userExists = await User.findById(result.userId);
        if (!userExists) throw new AppError(404, 'User not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        let inviterCoach = user.coach;
        if (!inviterCoach) {
            const ownerUser = await User.findById(eventExists.owner).select('coach').lean();
            inviterCoach = ownerUser?.coach || null;
        }
        if (!inviterCoach) {
            throw new AppError(
                400,
                'Event organizer must have a coach profile to record invitations.'
            );
        }

        // check if already invited to this event
        const alreadyInvited = await Invite.exists({
            invitee: result.userId,
            event: result.eventId,
        });
        if (alreadyInvited) throw new AppError(409, 'You already invited this user.');

        const invite = await Invite.create({
            inviter: inviterCoach,
            invitee: result.userId,
            event: result.eventId,
        });

        const inviterName =
            user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : 'A coach';
        void notifyEventInvite({
            userId: result.userId,
            eventId: String(eventExists._id),
            eventName: eventExists.name,
            inviterName,
        }).catch((err) =>
            console.error('notifyEventInvite failed:', err)
        );

        res.status(201).json({
            success: true,
            message: 'Invited to event successfully',
        });
    } catch (err) {
        next(err);
    }
};

// end photo
export const endPhoto = async (req, res, next) => {
    try {
        if (!req.fileMeta) throw new AppError(400, 'No certificate uploaded');
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = JSON.parse(req.body.data);
        const photo = req.fileMeta;
        const user = req.user;
        const eventId = zodValidation.eventId.parse(data.eventId);

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        const endedAt = eventExists.endTime ? new Date(eventExists.endTime) : null;
        if (!endedAt || Date.now() < endedAt.getTime()) {
            throw new AppError(403, 'Photos can only be uploaded after the event has ended');
        }

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        const dupFilter = user.coach
            ? { coach: user.coach, event: eventId }
            : { event: eventId, user: user._id };
        const alreadySubmitted = await EventEndPhoto.exists(dupFilter);
        if (alreadySubmitted) {
            throw new AppError(409, 'You already submitted a photo');
        }

        const submitPhoto = await EventEndPhoto.create({
            ...(user.coach ? { coach: user.coach } : { user: user._id }),
            event: eventId,
            photo,
        });

        res.status(201).json({
            success: true,
            message: 'Photo submitted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const getEventParticipants = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = req.params.eventId;
        const user = req.user;
        const eventId = zodValidation.eventId.parse(data);
        const { perPage, pageNumber, ...filters } = zodValidation.getEventParticipants.parse(
            req.body
        );
        const skip = (pageNumber - 1) * perPage;

        const eventExists = await Event.findById(eventId);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        const query = { event: eventId, ...filters };

        const totalParticipants = await Reservation.countDocuments(query);
        const getEventParticipants = await Reservation.find(query)
            .skip(skip)
            .limit(perPage)
            .populate([
                {
                    path: 'participant',
                    populate: [
                        { path: 'mainSport', select: 'name' },
                        { path: 'sportGoal', select: 'name' },
                    ],
                },
                { path: 'event', select: 'name' },
            ])
            .lean();

        for (let res of getEventParticipants) {
            res.user = await User.findOne(
                { participant: res.participant._id },
                'firstName lastName'
            );
        }
        res.status(200).json({
            success: true,
            data: getEventParticipants,
            pagination: {
                page: pageNumber,
                perPage,
                total: totalParticipants,
                totalPages: Math.ceil(totalParticipants / perPage),
            },
        });
    } catch (err) {
        next(err);
    }
};

export const approveReservation = async (req, res, next) => {
    try {
        if (!req.user || (req.user.role !== 0 && !req.user.coach)) {
            throw new AppError(!req.user ? 401 : 403);
        }

        const data = req.params.requestId;
        const user = req.user;
        const requestId = zodValidation.mongoObjectId.parse(data);

        const reqExists = await Reservation.findById(requestId);
        if (!reqExists) throw new AppError(404, 'Request not found');

        const eventExists = await Event.findById(reqExists.event);
        if (!eventExists) throw new AppError(404, 'Event not found');

        if (
            !eventExists.owner.equals(user._id) &&
            !eventExists.backupCoach?.equals(user._id) &&
            user.role !== 0
        ) {
            throw new AppError(403, 'You are not the owner or backupCoach');
        }

        reqExists.isApproved = true;
        await reqExists.save();

        // Find the user this reservation belongs to via participant.
        try {
            const participantUser = await User.findOne({
                participant: reqExists.participant,
            })
                .select('_id')
                .lean();
            if (participantUser) {
                void notifyJoinRequestApproved({
                    userId: participantUser._id.toString(),
                    requestType: 'event',
                    eventId: String(eventExists._id),
                    eventName: eventExists.name,
                });
            }
        } catch (err) {
            console.error('notifyJoinRequestApproved (event) failed:', err);
        }

        res.status(201).json({
            success: true,
            data: reqExists,
        });
    } catch (err) {
        next(err);
    }
};

async function resolveCoachProfileContext(idParam) {
    const parsedId = zodValidation.coachId.parse(idParam);

    let coach = await Coach.findById(parsedId);
    let user = null;

    if (coach) {
        user = await User.findOne({ coach: coach._id }).select(
            '-password -isEmailVerified -isPhoneVerified'
        );
        return { coach, user };
    }

    user = await User.findById(parsedId).select(
        '-password -isEmailVerified -isPhoneVerified'
    );
    if (!user?.coach) {
        throw new AppError(404, 'Coach not found');
    }

    coach = await Coach.findById(user.coach);
    if (!coach) {
        throw new AppError(404, 'Coach not found');
    }

    return { coach, user };
}

export const getCoachDetails = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const { coach, user } = await resolveCoachProfileContext(req.params.coachId);
        const coachId = coach._id;

        const club = user ? await Club.find({ creator: user._id }) : [];
        const clubGroup = await ClubGroup.find({ owner: coachId });
        const branch = await Branch.find({ coach: coachId }).populate({
            path: 'sport',
            select: 'name groupName icon coachBadge',
        });
        const event = user
            ? await Event.find({
                  $and: [
                      { $or: [{ owner: user._id }, { backupCoach: user._id }] },
                      { $or: [{ status: 'active' }, { status: { $exists: false } }] },
                  ],
              })
            .sort({ startTime: -1 })
                  .populate([
                      { path: 'club', select: 'name' },
                      { path: 'group', select: 'name' },
                      { path: 'sport', select: 'name' },
                      { path: 'sportGroup', select: 'name' },
                      { path: 'style', select: 'name' },
                      { path: 'salon', select: 'name' },
                      { path: 'facility', select: 'name' },
                  ])
            : [];

        const allData = {
            coach,
            user: user ?? null,
            club,
            clubGroup,
            branch,
            event,
        };

        res.status(200).json({
            success: true,
            data: allData,
        });
    } catch (err) {
        next(err);
    }
};

export const getMyCreatedEvents = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new AppError(401);
        }
        if (!req.user.coach && req.user.role !== 0) {
            throw new AppError(403);
        }

        const user = req.user;
        const page = parseInt(req.body?.pageNumber) || 1;
        const perPage = parseInt(req.body?.perPage) || 10;
        const skip = (page - 1) * perPage;

        const query =
            user.role === 0 && !user.coach
                ? {}
                : {
                      $or: [{ owner: user._id }, { backupCoach: user._id }],
                  };

        const total = await Event.countDocuments(query);

        const events = await Event.find(query)
            .populate([
                { path: 'owner', select: 'firstName lastName photo coach' },
                { path: 'backupCoach', select: 'firstName lastName photo coach' },
                { path: 'sportGroup', select: 'name' },
                { path: 'sport', select: 'name' },
                { path: 'facility', select: 'name address photo' },
                { path: 'salon', select: 'name' },
                { path: 'club', select: 'name' },
                { path: 'group', select: 'name' },
            ])
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(perPage)
            .lean();

        // Add participant count for each event
        for (let event of events) {
            event.participantCount = await Reservation.countDocuments({
                event: event._id,
                isCancelled: false,
            });
            event.checkedInCount = await Reservation.countDocuments({
                event: event._id,
                isCheckedIn: true,
                isCancelled: false,
            });
        }

        res.status(200).json({
            success: true,
            data: events,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / perPage),
                total,
                perPage,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getListingQuote = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);
        if (!req.user.coach && req.user.role !== 0) {
            throw new AppError(403);
        }

        const { sessionCount } = zodValidation.listingQuoteQuerySchema.parse(req.query);
        const unitPrice = getListingPricePerSlot();
        const totalAmount = unitPrice * sessionCount;

        res.status(200).json({
            success: true,
            data: {
                quantity: sessionCount,
                unitPrice,
                totalAmount,
                currency: 'TRY',
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Public coach follow stats: follower count + (when logged-in gamer) isFollowing flag.
 */
export const getCoachFollowStats = async (req, res, next) => {
    try {
        const coachId = zodValidation.coachId.parse(req.params.coachId);

        const coachExists = await Coach.exists({ _id: coachId });
        if (!coachExists) throw new AppError(404, 'Coach not found');

        const followerCount = await Follow.countDocuments({ followingCoach: coachId });

        let isFollowing = false;
        if (req.user?.participant) {
            const existing = await Follow.exists({
                follower: req.user._id,
                followingCoach: coachId,
            });
            isFollowing = Boolean(existing);
        }

        res.status(200).json({
            success: true,
            data: {
                coachId,
                followerCount,
                isFollowing,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Public, paginated list of users following a coach. Returns minimal public profile
 * info only (no email/phone).
 */
export const getCoachFollowers = async (req, res, next) => {
    try {
        const coachId = zodValidation.coachId.parse(req.params.coachId);

        const coachExists = await Coach.exists({ _id: coachId });
        if (!coachExists) throw new AppError(404, 'Coach not found');

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit, 10) || 20)
        );
        const skip = (page - 1) * limit;

        const filter = { followingCoach: coachId };

        const [total, rows] = await Promise.all([
            Follow.countDocuments(filter),
            Follow.find(filter)
                .populate({
                    path: 'follower',
                    select: 'firstName lastName photo participant role isActive',
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
        ]);

        const followers = rows
            .filter((row) => row.follower && row.follower.isActive !== false)
            .map((row) => ({
                _id: row._id,
                followedAt: row.createdAt,
                user: {
                    _id: row.follower._id,
                    firstName: row.follower.firstName,
                    lastName: row.follower.lastName,
                    photo: row.follower.photo,
                    participantId: row.follower.participant || null,
                    role: row.follower.role,
                },
            }));

        res.status(200).json({
            success: true,
            data: {
                total,
                page,
                limit,
                totalPages: Math.max(1, Math.ceil(total / limit)),
                followers,
            },
        });
    } catch (err) {
        next(err);
    }
};
