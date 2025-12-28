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
                'event_created',
                'event_updated',
                'event_cancelled',
                'reservation_approved',
                'reservation_rejected',
                'reservation_reminder',
                'certificate_approved',
                'certificate_rejected',
                'join_request_approved',
                'join_request_rejected',
                'invite_received',
                'message_received',
                'follow_new_event',
                'system_announcement',
                'maintenance_notice',
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
            enum: ['bell', 'check-circle', 'x-circle', 'calendar', 'user', 'alert', 'info'],
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

