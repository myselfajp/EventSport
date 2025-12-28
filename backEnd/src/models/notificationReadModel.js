import mongoose from 'mongoose';

const notificationReadSchema = new mongoose.Schema(
    {
        notification: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Notification',
            required: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Unique index: یک کاربر نمی‌تواند یک notification را دوبار read کند
notificationReadSchema.index({ notification: 1, user: 1 }, { unique: true });
notificationReadSchema.index({ user: 1, isRead: 1, createdAt: -1 });

const NotificationRead = mongoose.model('NotificationRead', notificationReadSchema);

export default NotificationRead;

