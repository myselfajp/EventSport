import Notification from '../models/notificationModel.js';

/**
 * Create a notification
 * @param {Object} options - Notification options
 * @param {String} options.scope - 'user', 'global', 'role', 'group'
 * @param {String} options.type - Notification type
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {Object} options.data - Additional data
 * @param {String} options.userId - User ID (for scope='user')
 * @param {Number} options.targetRole - Role number (for scope='role')
 * @param {Array} options.targetUsers - Array of user IDs (for scope='group')
 * @param {String} options.priority - 'low', 'normal', 'high', 'urgent'
 * @param {String} options.icon - Icon name
 * @param {Date} options.expiresAt - Expiration date
 * @param {String} options.createdBy - User ID who created this notification
 * @returns {Promise<Object>} Created notification
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


    if (icon) {
        notificationData.icon = icon;
    }

    if (expiresAt) {
        notificationData.expiresAt = expiresAt;
    }

    if (createdBy) {
        notificationData.createdBy = createdBy;
    }

    const notification = await Notification.create(notificationData);
    return notification;
};

/**
 * Create notification for nearby event (same district)
 */
export const notifyNearbyEventCreated = async ({
    eventId,
    eventName,
    coachName,
    districtName,
    userIds,
}) => {
    if (!userIds?.length) return null;

    return await createNotification({
        scope: 'group',
        type: 'nearby_event_created',
        title: 'New Event in Your District',
        message: `${coachName} created "${eventName}" in ${districtName}.`,
        data: {
            eventId,
            eventName,
            coachName,
            districtName,
        },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'map-pin',
    });
};

/**
 * Create notification for event created
 */
export const notifyEventCreated = async (eventId, eventName, coachId, coachName, userIds = null) => {
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
        // Notify specific users
        return await createNotification({
            scope: 'group',
            type: 'event_created',
            title: 'New Event Available',
            message: `${coachName} created a new event: ${eventName}`,
            data: {
                eventId,
                coachId,
                coachName,
                eventName,
            },
            targetUsers: userIds,
            priority: 'normal',
            icon: 'calendar',
        });
    } else {
        // Notify all users (global)
        return await createNotification({
            scope: 'global',
            type: 'event_created',
            title: 'New Event Available',
            message: `${coachName} created a new event: ${eventName}`,
            data: {
                eventId,
                coachId,
                coachName,
                eventName,
            },
            priority: 'normal',
            icon: 'calendar',
        });
    }
};

/**
 * Create notification for certificate approval
 */
export const notifyCertificateApproved = async (userId, branchId, sportName, level) => {
    return await createNotification({
        scope: 'user',
        type: 'certificate_approved',
        title: 'Certificate Approved',
        message: `Your ${sportName} certificate (Level ${level}) has been approved`,
        data: {
            branchId,
            sportName,
            level,
        },
        userId,
        priority: 'high',
        icon: 'check-circle',
    });
};

/**
 * Create notification for certificate rejection
 */
export const notifyCertificateRejected = async (userId, branchId, sportName, level) => {
    return await createNotification({
        scope: 'user',
        type: 'certificate_rejected',
        title: 'Certificate Rejected',
        message: `Your ${sportName} certificate (Level ${level}) has been rejected`,
        data: {
            branchId,
            sportName,
            level,
        },
        userId,
        priority: 'normal',
        icon: 'x-circle',
    });
};

/**
 * Create notification for reservation approval
 */
export const notifyReservationApproved = async (userId, eventId, eventName) => {
    return await createNotification({
        scope: 'user',
        type: 'reservation_approved',
        title: 'Reservation Approved',
        message: `Your reservation for "${eventName}" has been approved`,
        data: {
            eventId,
            eventName,
        },
        userId,
        priority: 'normal',
        icon: 'check-circle',
    });
};

/**
 * Create notification for reservation rejection
 */
export const notifyReservationRejected = async (userId, eventId, eventName) => {
    return await createNotification({
        scope: 'user',
        type: 'reservation_rejected',
        title: 'Reservation Rejected',
        message: `Your reservation for "${eventName}" has been rejected`,
        data: {
            eventId,
            eventName,
        },
        userId,
        priority: 'normal',
        icon: 'x-circle',
    });
};

/**
 * Reminder: check-in opens in ~24 hours.
 */
export const notifyCheckInOpensReminder24h = async (
    userId,
    eventId,
    eventName,
    checkInOpensAt,
    checkInOpensLabel
) => {
    return await createNotification({
        scope: 'user',
        type: 'check_in_opens_reminder_24h',
        title: 'Check-in opens tomorrow',
        message: `Check-in for "${eventName}" opens in 24 hours${checkInOpensLabel ? ` (${checkInOpensLabel})` : ''}.`,
        data: {
            eventId,
            eventName,
            checkInOpensAt,
            reminderKind: '24h',
        },
        userId,
        priority: 'normal',
        icon: 'bell',
        expiresAt: checkInOpensAt ? new Date(checkInOpensAt) : undefined,
    });
};

/**
 * Reminder: check-in opens in ~2 hours.
 */
export const notifyCheckInOpensReminder2h = async (
    userId,
    eventId,
    eventName,
    checkInOpensAt,
    checkInOpensLabel
) => {
    return await createNotification({
        scope: 'user',
        type: 'check_in_opens_reminder_2h',
        title: 'Check-in opens soon',
        message: `Check-in for "${eventName}" opens in about 2 hours${checkInOpensLabel ? ` (${checkInOpensLabel})` : ''}. Don't forget to check in!`,
        data: {
            eventId,
            eventName,
            checkInOpensAt,
            reminderKind: '2h',
        },
        userId,
        priority: 'high',
        icon: 'bell',
        expiresAt: checkInOpensAt ? new Date(checkInOpensAt) : undefined,
    });
};

/**
 * Create notification for reservation reminder
 */
export const notifyReservationReminder = async (userId, eventId, eventName, startTime) => {
    return await createNotification({
        scope: 'user',
        type: 'reservation_reminder',
        title: 'Event Reminder',
        message: `Your event "${eventName}" starts soon`,
        data: {
            eventId,
            eventName,
            startTime,
        },
        userId,
        priority: 'high',
        icon: 'bell',
        expiresAt: new Date(startTime),
    });
};

/**
 * Notify followers of a coach about a new event the coach just created.
 */
export const notifyCoachFollowersOfEvent = async ({
    eventId,
    eventName,
    coachId,
    coachName,
    userIds,
}) => {
    if (!userIds?.length) return null;

    return await createNotification({
        scope: 'group',
        type: 'follow_new_event',
        title: 'New event from a coach you follow',
        message: `${coachName} just created "${eventName}".`,
        data: {
            eventId,
            eventName,
            coachId,
            coachName,
        },
        targetUsers: userIds,
        priority: 'normal',
        icon: 'calendar',
    });
};

/**
 * Create system announcement (global)
 */
export const notifySystemAnnouncement = async (title, message, priority = 'normal', expiresAt = null) => {
    return await createNotification({
        scope: 'global',
        type: 'system_announcement',
        title,
        message,
        priority,
        icon: 'info',
        expiresAt,
    });
};

