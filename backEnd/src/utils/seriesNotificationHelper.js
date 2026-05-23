import { createNotification } from './notificationHelper.js';

export async function notifySeriesSessionsCancelled({
    userIds,
    seriesName,
    cancelledSessions,
    scope,
}) {
    if (!userIds?.length) return;

    const count = cancelledSessions?.length ?? 1;
    const scopeText = scope === 'following' ? 'upcoming sessions in the series' : 'this session';

    await createNotification({
        scope: 'group',
        type: 'series_sessions_cancelled',
        title: 'Event session(s) cancelled',
        message: `${count} session(s) in "${seriesName}" were cancelled (${scopeText}).`,
        data: { seriesName, cancelledCount: count, scope },
        targetUsers: userIds,
        priority: 'high',
        icon: 'calendar',
    });
}

export async function notifySeriesSessionsRescheduled({
    userIds,
    eventName,
    scope,
}) {
    if (!userIds?.length) return;

    const scopeText =
        scope === 'following'
            ? 'One or more upcoming sessions in your series were rescheduled.'
            : 'An event session you joined was rescheduled.';

    await createNotification({
        scope: 'group',
        type: 'series_sessions_rescheduled',
        title: 'Event schedule updated',
        message: `${scopeText} (${eventName})`,
        data: { eventName, scope },
        targetUsers: userIds,
        priority: 'high',
        icon: 'calendar',
    });
}

export async function notifySeriesEnrollmentConfirmed(userId, seriesName, sessionCount) {
    return createNotification({
        scope: 'user',
        type: 'series_enrollment_confirmed',
        title: 'Series enrollment confirmed',
        message: `You are enrolled in ${sessionCount} session(s) of "${seriesName}".`,
        data: { seriesName, sessionCount },
        userId,
        priority: 'normal',
        icon: 'check-circle',
    });
}
