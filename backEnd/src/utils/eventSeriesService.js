import Event from '../models/eventModel.js';
import EventSeries from '../models/eventSeriesModel.js';
import SeriesEnrollment from '../models/seriesEnrollmentModel.js';
import CoachListingOrder from '../models/coachListingOrderModel.js';
import Reservation from '../models/reservationModel.js';
import User from '../models/userModel.js';
import { AppError } from './appError.js';
import { genSecret } from './secretIdGen.js';
import {
    generateSessionSchedule,
    getListingPricePerSlot,
    frequencyLabel,
} from './recurrenceHelper.js';
import { resolveEventDistrict } from './eventDistrictHelper.js';
import {
    notifyUsersInEventDistrict,
    notifyCoachFollowersOfNewEvent,
    notifyAffinityFollowersOfNewEvent,
    notifyFacilityOwnerOfNewEvent,
} from './eventDistrictHelper.js';
import {
    notifySeriesSessionsCancelled,
    notifySeriesSessionsRescheduled,
    notifySeriesEnrollmentConfirmed,
} from './seriesNotificationHelper.js';
import { randomUUID } from 'crypto';
import { resolveCheckInOpensHours, checkInOpensAt } from './eventCheckInHelper.js';

export async function createRecurringEventSeries({
    user,
    eventPayload,
    recurrence,
    listingPurchaseConfirmed,
}) {
    const { frequency, interval, sessionCount } = recurrence;

    if (!listingPurchaseConfirmed) {
        throw new AppError(
            400,
            'Listing purchase confirmation is required for recurring event series.'
        );
    }

    const unitPrice = getListingPricePerSlot();
    const totalListingAmount = unitPrice * sessionCount;

    const sessions = generateSessionSchedule({
        anchorStartTime: eventPayload.startTime,
        anchorEndTime: eventPayload.endTime,
        frequency,
        interval,
        sessionCount,
    });

    const sessionDurationMs =
        sessions[0].endTime.getTime() - sessions[0].startTime.getTime();

    const seriesSecret = eventPayload.private ? genSecret() : null;

    const listingOrder = await CoachListingOrder.create({
        coach: user._id,
        quantity: sessionCount,
        unitPrice,
        totalAmount: totalListingAmount,
        status: 'confirmed',
        confirmedAt: new Date(),
        note: `Listing purchase for ${sessionCount}-session ${frequency} series`,
    });

    const series = await EventSeries.create({
        owner: user._id,
        name: eventPayload.name,
        frequency,
        interval,
        sessionCount,
        sessionDurationMs,
        anchorStartTime: eventPayload.startTime,
        listingOrder: listingOrder._id,
        private: eventPayload.private,
        secretId: seriesSecret,
        participationFeePerSession: eventPayload.participationFee,
        priceType: eventPayload.priceType,
    });

    listingOrder.series = series._id;
    await listingOrder.save();

    const createdEvents = [];
    const baseName = eventPayload.name;

    for (const session of sessions) {
        const sessionName =
            sessionCount > 1 ? `${baseName} (${session.sessionIndex}/${sessionCount})` : baseName;

        const doc = {
            ...eventPayload,
            name: sessionName,
            startTime: session.startTime,
            endTime: session.endTime,
            isRecurring: true,
            series: series._id,
            sessionIndex: session.sessionIndex,
            owner: user._id,
        };

        if (eventPayload.private) {
            doc.secretId = seriesSecret;
        }

        const ev = await Event.create(doc);
        createdEvents.push(ev);
    }

    const coachName =
        user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'A coach';

    for (const ev of createdEvents) {
        void notifyUsersInEventDistrict(ev, user._id, coachName);
    }

    // Notify coach followers only once per series (first session) to avoid spam.
    if (createdEvents[0]) {
        void notifyCoachFollowersOfNewEvent(createdEvents[0], user, coachName);
        void notifyAffinityFollowersOfNewEvent(createdEvents[0], user._id);
        void notifyFacilityOwnerOfNewEvent(createdEvents[0], user._id, coachName);
    }

    return {
        series,
        listingOrder,
        events: createdEvents,
        listingSummary: {
            quantity: sessionCount,
            unitPrice,
            totalAmount: totalListingAmount,
            frequencyLabel: frequencyLabel(frequency, interval),
        },
    };
}

export async function getSeriesSessions(seriesId) {
    return Event.find({ series: seriesId })
        .sort({ sessionIndex: 1 })
        .populate([
            { path: 'sport', select: 'name' },
            { path: 'facility', select: 'name address' },
            { path: 'district', select: 'name' },
        ])
        .lean();
}

export async function cancelEventsWithScope(event, scope, userId) {
    const isFollowing = scope === 'following';
    const filter = { series: event.series, status: 'active' };
    if (isFollowing) {
        filter.sessionIndex = { $gte: event.sessionIndex ?? 1 };
    } else {
        filter._id = event._id;
    }

    const toCancel = await Event.find(filter).select('_id name sessionIndex startTime').lean();
    if (toCancel.length === 0) {
        throw new AppError(404, 'No events to cancel');
    }

    const now = new Date();
    await Event.updateMany(
        { _id: { $in: toCancel.map((e) => e._id) } },
        { $set: { status: 'cancelled', cancelledAt: now } }
    );

    const affectedIds = toCancel.map((e) => e._id);
    const reservations = await Reservation.find({
        event: { $in: affectedIds },
        isCancelled: false,
    })
        .populate({ path: 'event', select: 'name sessionIndex' })
        .lean();

    const userIds = new Set();
    for (const r of reservations) {
        const u = await User.findOne({ participant: r.participant }).select('_id').lean();
        if (u) userIds.add(u._id.toString());
    }

    if (userIds.size > 0) {
        void notifySeriesSessionsCancelled({
            userIds: [...userIds],
            seriesName: event.name?.replace(/\s\(\d+\/\d+\)$/, '') || 'Event series',
            cancelledSessions: toCancel,
            scope: isFollowing ? 'following' : 'single',
        });
    }

    return { cancelledCount: toCancel.length, eventIds: affectedIds };
}

export async function applyEventEditWithScope(event, updateData, scope) {
    const isFollowing = scope === 'following';
    const timeChanged =
        updateData.startTime !== undefined || updateData.endTime !== undefined;

    let targets = [event];
    if (isFollowing && event.series) {
        targets = await Event.find({
            series: event.series,
            sessionIndex: { $gte: event.sessionIndex ?? 1 },
            status: 'active',
        });
    }

    const oldStart = event.startTime ? new Date(event.startTime).getTime() : null;
    const newStart =
        updateData.startTime !== undefined
            ? new Date(updateData.startTime).getTime()
            : oldStart;
    const oldEnd = event.endTime ? new Date(event.endTime).getTime() : null;
    const newEnd =
        updateData.endTime !== undefined ? new Date(updateData.endTime).getTime() : oldEnd;
    const deltaStart = newStart != null && oldStart != null ? newStart - oldStart : 0;
    const deltaEnd = newEnd != null && oldEnd != null ? newEnd - oldEnd : 0;

    const sharedFields = { ...updateData };
    delete sharedFields.startTime;
    delete sharedFields.endTime;
    delete sharedFields.sessionIndex;
    delete sharedFields.series;

    const updatedIds = [];

    for (const target of targets) {
        const patch = { ...sharedFields };

        if (timeChanged && isFollowing && target._id.equals(event._id)) {
            if (updateData.startTime !== undefined) patch.startTime = updateData.startTime;
            if (updateData.endTime !== undefined) patch.endTime = updateData.endTime;
        } else if (timeChanged && isFollowing && !target._id.equals(event._id)) {
            if (deltaStart) {
                patch.startTime = new Date(new Date(target.startTime).getTime() + deltaStart);
            }
            if (deltaEnd) {
                patch.endTime = new Date(new Date(target.endTime).getTime() + deltaEnd);
            }
        } else if (timeChanged && !isFollowing) {
            if (updateData.startTime !== undefined) patch.startTime = updateData.startTime;
            if (updateData.endTime !== undefined) patch.endTime = updateData.endTime;
        }

        const updated = await Event.findByIdAndUpdate(
            target._id,
            { $set: patch },
            { new: true }
        );
        updatedIds.push(updated._id);
    }

    if (timeChanged) {
        const reservations = await Reservation.find({
            event: { $in: updatedIds },
            isCancelled: false,
        }).lean();

        const notifyUsers = new Set();
        for (const r of reservations) {
            const u = await User.findOne({ participant: r.participant }).select('_id').lean();
            if (u) notifyUsers.add(u._id.toString());
        }

        if (notifyUsers.size > 0) {
            void notifySeriesSessionsRescheduled({
                userIds: [...notifyUsers],
                eventName: event.name,
                scope: isFollowing ? 'following' : 'single',
            });
        }
    }

    return { updatedCount: updatedIds.length, eventIds: updatedIds };
}

export async function enrollParticipantInSeries({
    user,
    seriesId,
    consent,
    legalVersionIds,
    req,
    logRegistrationConsent,
}) {
    const series = await EventSeries.findById(seriesId).lean();
    if (!series || series.status === 'cancelled') {
        throw new AppError(404, 'Event series not found');
    }

    const existingEnrollment = await SeriesEnrollment.findOne({
        participant: user.participant,
        series: seriesId,
        status: 'active',
    });
    if (existingEnrollment) {
        throw new AppError(409, 'You are already enrolled in this series.');
    }

    const now = new Date();
    const events = await Event.find({
        series: seriesId,
        status: 'active',
        startTime: { $gt: now },
    })
        .sort({ sessionIndex: 1 })
        .select('startTime endTime capacity priceType status style name')
        .lean();

    if (events.length === 0) {
        throw new AppError(400, 'No upcoming sessions available in this series.');
    }

    const reservationIds = [];

    for (const event of events) {
        const already = await Reservation.findOne({
            participant: user.participant,
            event: event._id,
        });
        if (already) {
            reservationIds.push(already._id);
            continue;
        }

        const checkInHours = await resolveCheckInOpensHours(event);
        const checkInDeadline = checkInOpensAt(event.startTime, checkInHours);
        const isFreeEvent = event.priceType === 'Free';

        const reservation = await Reservation.create({
            participant: user.participant,
            event: event._id,
            checkInDeadline,
            isJoined: true,
            isPaid: isFreeEvent,
            qr: randomUUID(),
            ...consent,
        });

        try {
            await logRegistrationConsent(
                req,
                user,
                event._id,
                reservation._id,
                consent,
                legalVersionIds
            );
        } catch (logErr) {
            await Reservation.deleteOne({ _id: reservation._id });
            throw logErr;
        }

        reservationIds.push(reservation._id);
    }

    const totalFee =
        series.priceType === 'Free'
            ? 0
            : series.participationFeePerSession * reservationIds.length;

    const enrollment = await SeriesEnrollment.create({
        participant: user.participant,
        series: seriesId,
        reservations: reservationIds,
        sessionCount: reservationIds.length,
        totalFee,
        isPaid: series.priceType === 'Free',
    });

    void notifySeriesEnrollmentConfirmed(
        user._id.toString(),
        series.name,
        reservationIds.length
    );

    return { enrollment, reservationCount: reservationIds.length, totalFee };
}
