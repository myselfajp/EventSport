import { AppError } from '../utils/appError.js';
import Notification from '../models/notificationModel.js';
import NotificationRead from '../models/notificationReadModel.js';
import User from '../models/userModel.js';
import { mongoObjectId } from '../utils/validation.js';
import { createNotification as createNotificationHelper } from '../utils/notificationHelper.js';

export const getNotifications = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const { perPage = 20, pageNumber = 1, unreadOnly = false } = req.query;

        // 1. Personal notifications
        const personalQuery = {
            scope: 'user',
            user: user._id,
        };
        if (unreadOnly) {
            personalQuery.isRead = false;
        }

        const personalNotifications = await Notification.find(personalQuery)
            .sort({ createdAt: -1 })
            .limit(parseInt(perPage))
            .skip((parseInt(pageNumber) - 1) * parseInt(perPage))
            .lean();

        // 2. Global notifications
        const globalNotifications = await Notification.find({
            scope: 'global',
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        })
            .sort({ createdAt: -1 })
            .lean();

        // Get read status for global notifications
        const globalReadStatus = await NotificationRead.find({
            notification: { $in: globalNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        }).select('notification');

        const readGlobalIds = globalReadStatus.map((r) => r.notification.toString());
        let unreadGlobal = globalNotifications.filter(
            (n) => !readGlobalIds.includes(n._id.toString())
        );

        if (unreadOnly) {
            unreadGlobal = unreadGlobal;
        }

        // 3. Role-based notifications
        const roleNotifications = await Notification.find({
            scope: 'role',
            targetRole: user.role,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        })
            .sort({ createdAt: -1 })
            .lean();

        // Get read status for role notifications
        const roleReadStatus = await NotificationRead.find({
            notification: { $in: roleNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        }).select('notification');

        const readRoleIds = roleReadStatus.map((r) => r.notification.toString());
        let unreadRole = roleNotifications.filter(
            (n) => !readRoleIds.includes(n._id.toString())
        );

        if (unreadOnly) {
            unreadRole = unreadRole;
        }

        // 4. Group notifications
        const groupNotifications = await Notification.find({
            scope: 'group',
            targetUsers: user._id,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        })
            .sort({ createdAt: -1 })
            .lean();

        // Get read status for group notifications
        const groupReadStatus = await NotificationRead.find({
            notification: { $in: groupNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        }).select('notification');

        const readGroupIds = groupReadStatus.map((r) => r.notification.toString());
        let unreadGroup = groupNotifications.filter(
            (n) => !readGroupIds.includes(n._id.toString())
        );

        if (unreadOnly) {
            unreadGroup = unreadGroup;
        }

        // Combine all notifications
        const allNotifications = [
            ...personalNotifications,
            ...unreadGlobal,
            ...unreadRole,
            ...unreadGroup,
        ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        // Add read status for each notification
        const notificationsWithReadStatus = allNotifications.map((notification) => {
            if (notification.scope === 'user') {
                return {
                    ...notification,
                    isRead: notification.isRead || false,
                };
            } else {
                // For global, role, group - check NotificationRead
                const isRead =
                    readGlobalIds.includes(notification._id.toString()) ||
                    readRoleIds.includes(notification._id.toString()) ||
                    readGroupIds.includes(notification._id.toString());
                return {
                    ...notification,
                    isRead,
                };
            }
        });

        // Count unread
        const unreadCount = notificationsWithReadStatus.filter((n) => !n.isRead).length;

        res.status(200).json({
            success: true,
            data: notificationsWithReadStatus,
            unreadCount,
            total: notificationsWithReadStatus.length,
        });
    } catch (err) {
        next(err);
    }
};

export const getUnreadCount = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        // Count personal unread
        const personalUnread = await Notification.countDocuments({
            scope: 'user',
            user: user._id,
            isRead: false,
        });

        // Count global unread
        const globalNotifications = await Notification.find({
            scope: 'global',
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const globalRead = await NotificationRead.countDocuments({
            notification: { $in: globalNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        });

        const globalUnread = globalNotifications.length - globalRead;

        // Count role unread
        const roleNotifications = await Notification.find({
            scope: 'role',
            targetRole: user.role,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const roleRead = await NotificationRead.countDocuments({
            notification: { $in: roleNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        });

        const roleUnread = roleNotifications.length - roleRead;

        // Count group unread
        const groupNotifications = await Notification.find({
            scope: 'group',
            targetUsers: user._id,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const groupRead = await NotificationRead.countDocuments({
            notification: { $in: groupNotifications.map((n) => n._id) },
            user: user._id,
            isRead: true,
        });

        const groupUnread = groupNotifications.length - groupRead;

        const totalUnread = personalUnread + globalUnread + roleUnread + groupUnread;

        res.status(200).json({
            success: true,
            data: {
                unreadCount: totalUnread,
            },
        });
    } catch (err) {
        next(err);
    }
};

export const markAsRead = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const notificationId = mongoObjectId.parse(req.params.notificationId);

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new AppError(404, 'Notification not found');
        }

        if (notification.scope === 'user') {
            // Personal notification - update directly
            if (!notification.user.equals(user._id)) {
                throw new AppError(403, 'Not authorized to mark this notification as read');
            }

            notification.isRead = true;
            notification.readAt = new Date();
            await notification.save();
        } else {
            // Global, role, or group - use NotificationRead
            await NotificationRead.findOneAndUpdate(
                {
                    notification: notificationId,
                    user: user._id,
                },
                {
                    isRead: true,
                    readAt: new Date(),
                },
                {
                    upsert: true,
                    new: true,
                }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Notification marked as read',
        });
    } catch (err) {
        next(err);
    }
};

export const markAllAsRead = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        // Mark all personal notifications as read
        await Notification.updateMany(
            {
                scope: 'user',
                user: user._id,
                isRead: false,
            },
            {
                isRead: true,
                readAt: new Date(),
            }
        );

        // Get all unread global, role, group notifications
        const globalNotifications = await Notification.find({
            scope: 'global',
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const roleNotifications = await Notification.find({
            scope: 'role',
            targetRole: user.role,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const groupNotifications = await Notification.find({
            scope: 'group',
            targetUsers: user._id,
            $or: [{ expiresAt: { $exists: false } }, { expiresAt: { $gt: new Date() } }],
        }).select('_id');

        const allNotificationIds = [
            ...globalNotifications.map((n) => n._id),
            ...roleNotifications.map((n) => n._id),
            ...groupNotifications.map((n) => n._id),
        ];

        // Mark all as read in NotificationRead
        const bulkOps = allNotificationIds.map((notificationId) => ({
            updateOne: {
                filter: {
                    notification: notificationId,
                    user: user._id,
                },
                update: {
                    isRead: true,
                    readAt: new Date(),
                },
                upsert: true,
            },
        }));

        if (bulkOps.length > 0) {
            await NotificationRead.bulkWrite(bulkOps);
        }

        res.status(200).json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (err) {
        next(err);
    }
};

export const deleteNotification = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const notificationId = mongoObjectId.parse(req.params.notificationId);

        const notification = await Notification.findById(notificationId);
        if (!notification) {
            throw new AppError(404, 'Notification not found');
        }

        // Only user can delete their personal notifications
        if (notification.scope === 'user') {
            if (!notification.user.equals(user._id)) {
                throw new AppError(403, 'Not authorized to delete this notification');
            }
            await Notification.findByIdAndDelete(notificationId);
        } else {
            // For global/role/group, just mark as read (don't delete)
            // Or create a "deleted" record
            await NotificationRead.findOneAndUpdate(
                {
                    notification: notificationId,
                    user: user._id,
                },
                {
                    isRead: true,
                    readAt: new Date(),
                },
                {
                    upsert: true,
                }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Notification deleted',
        });
    } catch (err) {
        next(err);
    }
};

// Admin only: Create notification
export const createNotification = async (req, res, next) => {
    try {
        const { scope, type, title, message, data, userId, targetRole, targetUsers, priority, actionUrl, icon, expiresAt } = req.body;

        if (!scope || !type || !title || !message) {
            throw new AppError(400, 'Missing required fields: scope, type, title, message');
        }

        const notificationData = {
            scope,
            type,
            title,
            message,
            data: data || {},
            priority: priority || 'normal',
            createdBy: req.user._id,
        };

        if (scope === 'user') {
            if (!userId) {
                throw new AppError(400, 'userId is required for user scope');
            }
            notificationData.userId = userId;
        } else if (scope === 'role') {
            if (targetRole === undefined) {
                throw new AppError(400, 'targetRole is required for role scope');
            }
            notificationData.targetRole = targetRole;
        } else if (scope === 'group') {
            if (!targetUsers || !Array.isArray(targetUsers) || targetUsers.length === 0) {
                throw new AppError(400, 'targetUsers array is required for group scope');
            }
            notificationData.targetUsers = targetUsers;
        }

        if (actionUrl) {
            notificationData.actionUrl = actionUrl;
        }

        if (icon) {
            notificationData.icon = icon;
        }

        if (expiresAt) {
            notificationData.expiresAt = expiresAt;
        }

        const notification = await createNotificationHelper(notificationData);

        res.status(201).json({
            success: true,
            message: 'Notification created successfully',
            data: notification,
        });
    } catch (err) {
        next(err);
    }
};

