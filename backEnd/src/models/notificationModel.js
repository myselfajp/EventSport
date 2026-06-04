import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        scope: {
            type: String,
            enum: ['user', 'global', 'role', 'group'],
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: function () {
                return this.scope === 'user';
            },
        },
        targetRole: {
            type: Number,
            required: function () {
                return this.scope === 'role';
            },
        },
        targetUsers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        type: {
            type: String,
            required: true,
            enum: [
                // Generic event lifecycle
                'event_created',
                'event_updated',
                'event_cancelled',
                // Reservation lifecycle (gamer-side)
                'reservation_approved',
                'reservation_rejected',
                'reservation_reminder',
                'event_starts_soon_2h',
                'reservation_event_updated',
                'reservation_event_cancelled',
                'liked_event_updated',
                'liked_event_cancelled',
                'waitlist_promoted',
                // Check-in reminders
                'check_in_opens_reminder_24h',
                'check_in_opens_reminder_2h',
                'check_in_opens_reminder_1h',
                'check_in_payment_warning_15m',
                // Certificates
                'certificate_approved',
                'certificate_rejected',
                // Joins / invites
                'join_request_approved',
                'join_request_rejected',
                'invite_received',
                'invite_event_received',
                'invite_group_received',
                'message_received',
                // Follow / discovery
                'follow_new_event',
                'nearby_event_created',
                'club_new_event',
                'club_group_new_event',
                'facility_new_event',
                // Coach / facility owner side
                'event_capacity_full',
                'event_capacity_min_reached',
                'facility_event_created',
                'coach_waitlist_backup_offer',
                // Series
                'series_sessions_cancelled',
                'series_sessions_rescheduled',
                'series_enrollment_confirmed',
                // System
                'system_announcement',
                'maintenance_notice',
                'segment_announcement',
            ],
        },
        title: {
            type: String,
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
        data: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
        priority: {
            type: String,
            enum: ['low', 'normal', 'high', 'urgent'],
            default: 'normal',
        },
        actionUrl: {
            type: String,
        },
        icon: {
            type: String,
            enum: [
                'bell',
                'check-circle',
                'x-circle',
                'calendar',
                'user',
                'alert',
                'info',
                'map-pin',
                'users',
                'coins',
                'clock',
                'flame',
                'gift',
                'star',
                'megaphone',
            ],
        },
        expiresAt: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ scope: 1, createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;

