import Notification from '../models/notificationModel.js';

/**
 * Build a deep-link path the frontend can use to open a relevant resource.
 * Frontend reads notification.actionUrl to navigate when a row is clicked.
 */
export function eventActionUrl(eventId) {
    if (!eventId) return undefined;
    return `/?event=${eventId}`;
}

/**
 * Create a notification.
 * @param {Object} options
 * @param {String} options.scope - 'user' | 'global' | 'role' | 'group'
 * @param {String} options.type - Notification type (see model enum)
 * @param {String} options.title
 * @param {String} options.message
 * @param {Object} [options.data]
 * @param {String} [options.userId] - required for scope='user'
 * @param {Number} [options.targetRole] - required for scope='role'
 * @param {Array}  [options.targetUsers] - required for scope='group'
 * @param {String} [options.priority] - 'low' | 'normal' | 'high' | 'urgent'
 * @param {String} [options.icon]
 * @param {String} [options.actionUrl]
 * @param {Date}   [options.expiresAt]
 * @param {String} [options.createdBy]
 * @returns {Promise<Object>}
 */
export const createNotification = async (options) => {
    const {
        scope,
        type,
        title,
        message,
        data = {},
        userId,
        targetRole,
        targetUsers,
        priority = 'normal',
        icon,
        actionUrl,
        expiresAt,
        createdBy,
    } = options;

    if (!scope || !type || !title || !message) {
        throw new Error('Missing required notification fields');
    }

    const notificationData = {
        scope,
        type,
        title,
        message,
        data,
        priority,
    };

    if (scope === 'user') {
        if (!userId) {
            throw new Error('userId is required for user scope');
        }
        notificationData.user = userId;
    } else if (scope === 'role') {
        if (targetRole === undefined) {
            throw new Error('targetRole is required for role scope');
        }
        notificationData.targetRole = targetRole;
    } else if (scope === 'group') {
        if (!targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0) {
            throw new Error('targetUsers array is required for group scope');
        }
        notificationData.targetUsers = targetUsers;
    }

    if (icon) notificationData.icon = icon;
    if (actionUrl) notificationData.actionUrl = actionUrl;
    if (expiresAt) notificationData.expiresAt = expiresAt;
    if (createdBy) notificationData.createdBy = createdBy;

    return Notification.create(notificationData);
};

/* -------------------------------------------------------------------------- */
/*  Discovery / follow                                                        */
/* -------------------------------------------------------------------------- */

export const notifyNearbyEventCreated = async ({
    eventId,
    eventName,
    coachName,
    districtName,
    userIds,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'nearby_event_created',
        title: 'New Event in Your District',
        message: `${coachName} created "${eventName}" in ${districtName}.`,
        data: { eventId, eventName, coachName, districtName },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'map-pin',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyCoachFollowersOfEvent = async ({
    eventId,
    eventName,
    coachId,
    coachName,
    userIds,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'follow_new_event',
        title: 'New event from a coach you follow',
        message: `${coachName} just created "${eventName}".`,
        data: { eventId, eventName, coachId, coachName },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'calendar',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyClubFollowersOfEvent = async ({
    eventId,
    eventName,
    clubId,
    clubName,
    userIds,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'club_new_event',
        title: 'New event in a club you follow',
        message: `${clubName} added a new event: "${eventName}".`,
        data: { eventId, eventName, clubId, clubName },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'users',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyClubGroupFollowersOfEvent = async ({
    eventId,
    eventName,
    groupId,
    groupName,
    userIds,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'club_group_new_event',
        title: 'New event in a group you follow',
        message: `${groupName} added a new event: "${eventName}".`,
        data: { eventId, eventName, groupId, groupName },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'users',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyFacilityFollowersOfEvent = async ({
    eventId,
    eventName,
    facilityId,
    facilityName,
    userIds,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'facility_new_event',
        title: 'New event at a facility you follow',
        message: `${facilityName} hosts a new event: "${eventName}".`,
        data: { eventId, eventName, facilityId, facilityName },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'map-pin',
        actionUrl: eventActionUrl(eventId),
    });
};

/* -------------------------------------------------------------------------- */
/*  Generic event lifecycle (all-users fallback)                              */
/* -------------------------------------------------------------------------- */

export const notifyEventCreated = async (
    eventId,
    eventName,
    coachId,
    coachName,
    userIds = null
) => {
    const base = {
        type: 'event_created',
        title: 'New Event Available',
        message: `${coachName} created a new event: ${eventName}`,
        data: { eventId, coachId, coachName, eventName },
        priority: 'normal',
        icon: 'calendar',
        actionUrl: eventActionUrl(eventId),
    };

    if (userIds?.length) {
        return createNotification({ ...base, scope: 'group', targetUsers: userIds });
    }
    return createNotification({ ...base, scope: 'global' });
};

/* -------------------------------------------------------------------------- */
/*  Reservation-side: cancel / update / waitlist promotion                    */
/* -------------------------------------------------------------------------- */

export const notifyReservationEventCancelled = async ({
    userIds,
    eventId,
    eventName,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'reservation_event_cancelled',
        title: 'Your event was cancelled',
        message: `"${eventName}" has been cancelled by the organizer.`,
        data: { eventId, eventName },
        targetUsers: userIds,
        priority: 'high',
        icon: 'x-circle',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyReservationEventUpdated = async ({
    userIds,
    eventId,
    eventName,
    changeSummary,
}) => {
    if (!userIds?.length) return null;
    const detail = changeSummary ? ` ${changeSummary}` : '';
    return createNotification({
        scope: 'group',
        type: 'reservation_event_updated',
        title: 'Your event was updated',
        message: `"${eventName}" has been updated.${detail}`,
        data: { eventId, eventName, changeSummary },
        targetUsers: userIds,
        priority: 'high',
        icon: 'calendar',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyLikedEventCancelled = async ({
    userIds,
    eventId,
    eventName,
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'liked_event_cancelled',
        title: 'Liked event cancelled',
        message: `"${eventName}" was cancelled. You had liked this event.`,
        data: { eventId, eventName },
        targetUsers: userIds,
        priority: 'high',
        icon: 'x-circle',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyLikedEventUpdated = async ({
    userIds,
    eventId,
    eventName,
    changeSummary,
}) => {
    if (!userIds?.length) return null;
    const detail = changeSummary ? ` ${changeSummary}` : '';
    return createNotification({
        scope: 'group',
        type: 'liked_event_updated',
        title: 'Liked event updated',
        message: `"${eventName}" was updated.${detail}`,
        data: { eventId, eventName, changeSummary },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'star',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyWaitlistPromoted = async ({
    userId,
    eventId,
    eventName,
}) => {
    if (!userId) return null;
    return createNotification({
        scope: 'user',
        type: 'waitlist_promoted',
        title: 'A spot opened up!',
        message: `A spot opened up in "${eventName}". Confirm your reservation soon.`,
        data: { eventId, eventName },
        userId,
        priority: 'urgent',
        icon: 'gift',
        actionUrl: eventActionUrl(eventId),
    });
};

/* -------------------------------------------------------------------------- */
/*  Certificates                                                              */
/* -------------------------------------------------------------------------- */

export const notifyCertificateApproved = async (userId, branchId, sportName, level) => {
    return createNotification({
        scope: 'user',
        type: 'certificate_approved',
        title: 'Certificate Approved',
        message: `Your ${sportName} certificate (Level ${level}) has been approved`,
        data: { branchId, sportName, level },
        userId,
        priority: 'high',
        icon: 'check-circle',
    });
};

export const notifyCertificateRejected = async (userId, branchId, sportName, level) => {
    return createNotification({
        scope: 'user',
        type: 'certificate_rejected',
        title: 'Certificate Rejected',
        message: `Your ${sportName} certificate (Level ${level}) has been rejected`,
        data: { branchId, sportName, level },
        userId,
        priority: 'normal',
        icon: 'x-circle',
    });
};

/* -------------------------------------------------------------------------- */
/*  Reservation approval / rejection (legacy)                                 */
/* -------------------------------------------------------------------------- */

export const notifyReservationApproved = async (userId, eventId, eventName) => {
    return createNotification({
        scope: 'user',
        type: 'reservation_approved',
        title: 'Reservation Approved',
        message: `Your reservation for "${eventName}" has been approved`,
        data: { eventId, eventName },
        userId,
        priority: 'normal',
        icon: 'check-circle',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyReservationRejected = async (userId, eventId, eventName) => {
    return createNotification({
        scope: 'user',
        type: 'reservation_rejected',
        title: 'Reservation Rejected',
        message: `Your reservation for "${eventName}" has been rejected`,
        data: { eventId, eventName },
        userId,
        priority: 'normal',
        icon: 'x-circle',
        actionUrl: eventActionUrl(eventId),
    });
};

/* -------------------------------------------------------------------------- */
/*  Check-in reminders                                                        */
/* -------------------------------------------------------------------------- */

export const notifyCheckInOpensReminder24h = async (
    userId,
    eventId,
    eventName,
    checkInOpensAt,
    checkInOpensLabel
) => {
    return createNotification({
        scope: 'user',
        type: 'check_in_opens_reminder_24h',
        title: 'Check-in opens tomorrow',
        message: `Check-in for "${eventName}" opens in 24 hours${checkInOpensLabel ? ` (${checkInOpensLabel})` : ''}.`,
        data: { eventId, eventName, checkInOpensAt, reminderKind: '24h' },
        userId,
        priority: 'normal',
        icon: 'clock',
        actionUrl: eventActionUrl(eventId),
        expiresAt: checkInOpensAt ? new Date(checkInOpensAt) : undefined,
    });
};

export const notifyCheckInOpensReminder2h = async (
    userId,
    eventId,
    eventName,
    checkInOpensAt,
    checkInOpensLabel
) => {
    return createNotification({
        scope: 'user',
        type: 'check_in_opens_reminder_2h',
        title: 'Check-in opens soon',
        message: `Check-in for "${eventName}" opens in about 2 hours${checkInOpensLabel ? ` (${checkInOpensLabel})` : ''}. Don't forget to check in!`,
        data: { eventId, eventName, checkInOpensAt, reminderKind: '2h' },
        userId,
        priority: 'high',
        icon: 'clock',
        actionUrl: eventActionUrl(eventId),
        expiresAt: checkInOpensAt ? new Date(checkInOpensAt) : undefined,
    });
};

export const notifyCheckInOpensReminder1h = async (
    userId,
    eventId,
    eventName,
    checkInOpensAt,
    checkInOpensLabel
) => {
    return createNotification({
        scope: 'user',
        type: 'check_in_opens_reminder_1h',
        title: 'Check-in opens in 1 hour',
        message: `Check-in for "${eventName}" opens in about 1 hour${checkInOpensLabel ? ` (${checkInOpensLabel})` : ''}.`,
        data: { eventId, eventName, checkInOpensAt, reminderKind: '1h' },
        userId,
        priority: 'high',
        icon: 'clock',
        actionUrl: eventActionUrl(eventId),
        expiresAt: checkInOpensAt ? new Date(checkInOpensAt) : undefined,
    });
};

/**
 * Paid event final warning: charge will be made within 15 minutes if no cancel.
 */
export const notifyCheckInPaymentWarning15m = async ({
    userId,
    eventId,
    eventName,
    chargeAt,
}) => {
    if (!userId) return null;
    return createNotification({
        scope: 'user',
        type: 'check_in_payment_warning_15m',
        title: 'Payment in 15 minutes',
        message:
            `Check-in for "${eventName}" will be processed in ~15 minutes. ` +
            'Per our refund policy, the amount will be charged from your account ' +
            'and refunds will not be available. If you will not attend, cancel ' +
            'your reservation under "My Reservations".',
        data: { eventId, eventName, chargeAt, reminderKind: '15m' },
        userId,
        priority: 'urgent',
        icon: 'coins',
        actionUrl: eventActionUrl(eventId),
        expiresAt: chargeAt ? new Date(chargeAt) : undefined,
    });
};

export const notifyReservationReminder = async (userId, eventId, eventName, startTime) => {
    return createNotification({
        scope: 'user',
        type: 'reservation_reminder',
        title: 'Event Reminder',
        message: `Your event "${eventName}" starts soon`,
        data: { eventId, eventName, startTime },
        userId,
        priority: 'high',
        icon: 'bell',
        actionUrl: eventActionUrl(eventId),
        expiresAt: new Date(startTime),
    });
};

/** Joined event starts in about 2 hours (event start time, not check-in). */
export const notifyEventStartsSoon2h = async (
    userId,
    eventId,
    eventName,
    startTime,
    startLabel
) => {
    return createNotification({
        scope: 'user',
        type: 'event_starts_soon_2h',
        title: 'Your event starts in 2 hours',
        message: `"${eventName}" starts in about 2 hours${startLabel ? ` (${startLabel})` : ''}.`,
        data: { eventId, eventName, startTime, reminderKind: '2h_start' },
        userId,
        priority: 'high',
        icon: 'clock',
        actionUrl: eventActionUrl(eventId),
        expiresAt: new Date(startTime),
    });
};

/* -------------------------------------------------------------------------- */
/*  Invites                                                                   */
/* -------------------------------------------------------------------------- */

export const notifyEventInvite = async ({
    userId,
    eventId,
    eventName,
    inviterName,
}) => {
    if (!userId) return null;
    return createNotification({
        scope: 'user',
        type: 'invite_event_received',
        title: 'You have been invited to an event',
        message: `${inviterName} invited you to "${eventName}". Open the invitation to view and accept it.`,
        data: { eventId, eventName, inviterName },
        userId,
        priority: 'high',
        icon: 'gift',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyGroupInvite = async ({
    userId,
    groupId,
    groupName,
    inviterName,
}) => {
    if (!userId) return null;
    return createNotification({
        scope: 'user',
        type: 'invite_group_received',
        title: 'You have been invited to a group',
        message: `${inviterName} invited you to ${groupName}.`,
        data: { groupId, groupName, inviterName },
        userId,
        priority: 'normal',
        icon: 'users',
    });
};

/* -------------------------------------------------------------------------- */
/*  Join request approvals                                                    */
/* -------------------------------------------------------------------------- */

export const notifyJoinRequestApproved = async ({
    userId,
    requestType,
    targetName,
    eventId,
    eventName,
}) => {
    if (!userId) return null;
    let message = `Your ${requestType} request was approved.`;
    if (targetName) {
        message = `Your request to join "${targetName}" was approved.`;
    }
    if (requestType === 'event' && eventName) {
        message = `Your join request for "${eventName}" was approved.`;
    }
    return createNotification({
        scope: 'user',
        type: 'join_request_approved',
        title: 'Request approved',
        message,
        data: { requestType, targetName, eventId, eventName },
        userId,
        priority: 'normal',
        icon: 'check-circle',
        actionUrl: eventId ? eventActionUrl(eventId) : undefined,
    });
};

export const notifyJoinRequestRejected = async ({
    userId,
    requestType,
    targetName,
}) => {
    if (!userId) return null;
    const message = targetName
        ? `Your request to join "${targetName}" was rejected.`
        : `Your ${requestType} request was rejected.`;
    return createNotification({
        scope: 'user',
        type: 'join_request_rejected',
        title: 'Request rejected',
        message,
        data: { requestType, targetName },
        userId,
        priority: 'normal',
        icon: 'x-circle',
    });
};

/* -------------------------------------------------------------------------- */
/*  Coach side: capacity, waitlist backup offer                               */
/* -------------------------------------------------------------------------- */

export const notifyCoachEventCapacityFull = async ({
    coachUserId,
    eventId,
    eventName,
    capacity,
}) => {
    if (!coachUserId) return null;
    return createNotification({
        scope: 'user',
        type: 'event_capacity_full',
        title: 'Your event is full',
        message: `"${eventName}" reached its capacity (${capacity}).`,
        data: { eventId, eventName, capacity },
        userId: coachUserId,
        priority: 'high',
        icon: 'flame',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyCoachEventMinReached = async ({
    coachUserId,
    eventId,
    eventName,
    minParticipants,
}) => {
    if (!coachUserId) return null;
    return createNotification({
        scope: 'user',
        type: 'event_capacity_min_reached',
        title: 'Minimum participants reached',
        message: `"${eventName}" reached its minimum participants (${minParticipants}). The event will run.`,
        data: { eventId, eventName, minParticipants },
        userId: coachUserId,
        priority: 'normal',
        icon: 'check-circle',
        actionUrl: eventActionUrl(eventId),
    });
};

export const notifyCoachWaitlistBackupOffer = async ({
    coachUserIds,
    eventId,
    eventName,
}) => {
    if (!coachUserIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'coach_waitlist_backup_offer',
        title: 'Last-minute coaching opportunity',
        message: `An event "${eventName}" needs a backup coach. Want to take this session?`,
        data: { eventId, eventName },
        targetUsers: coachUserIds,
        priority: 'urgent',
        icon: 'star',
        actionUrl: eventActionUrl(eventId),
    });
};

/* -------------------------------------------------------------------------- */
/*  Facility owner side                                                       */
/* -------------------------------------------------------------------------- */

export const notifyFacilityOwnerNewEvent = async ({
    ownerUserIds,
    eventId,
    eventName,
    facilityName,
    coachName,
}) => {
    if (!ownerUserIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'facility_event_created',
        title: 'New event at your facility',
        message: `${coachName} created "${eventName}" at ${facilityName}.`,
        data: { eventId, eventName, facilityName, coachName },
        targetUsers: ownerUserIds,
        priority: 'normal',
        icon: 'map-pin',
        actionUrl: eventActionUrl(eventId),
    });
};

/* -------------------------------------------------------------------------- */
/*  System / segment announcements                                            */
/* -------------------------------------------------------------------------- */

export const notifySystemAnnouncement = async (
    title,
    message,
    priority = 'normal',
    expiresAt = null
) => {
    return createNotification({
        scope: 'global',
        type: 'system_announcement',
        title,
        message,
        priority,
        icon: 'megaphone',
        expiresAt,
    });
};

export const notifySegmentAnnouncement = async ({
    userIds,
    title,
    message,
    icon = 'megaphone',
    priority = 'normal',
    actionUrl,
    expiresAt,
    createdBy,
    data = {},
}) => {
    if (!userIds?.length) return null;
    return createNotification({
        scope: 'group',
        type: 'segment_announcement',
        title,
        message,
        data,
        targetUsers: userIds,
        priority,
        icon,
        actionUrl,
        expiresAt,
        createdBy,
    });
};
