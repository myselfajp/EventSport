import AuditLog from '../models/auditLogModel.js';
import User from '../models/userModel.js';
import {
    AUDIT_ACTION_VALUES,
    AUDIT_ACTOR_ROLES,
    AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function validDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

export const listAuditLogs = async (req, res, next) => {
    try {
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 50));
        const skip = (page - 1) * limit;
        const filter = {};

        const role = typeof req.query.role === 'string' ? req.query.role.trim() : '';
        if (role && AUDIT_ACTOR_ROLES.includes(role) && !['admin', 'system'].includes(role)) {
            filter.$or = [{ actorRole: role }, { targetRole: role }];
        }

        const action = typeof req.query.action === 'string' ? req.query.action.trim() : '';
        if (action && AUDIT_ACTION_VALUES.includes(action)) filter.action = action;

        const entityType =
            typeof req.query.entityType === 'string' ? req.query.entityType.trim() : '';
        if (entityType && AUDIT_ENTITY_TYPES.includes(entityType)) {
            filter.entityType = entityType;
        }

        const from = validDate(req.query.from);
        const to = validDate(req.query.to);
        if (from || to) {
            filter.createdAt = {};
            if (from) filter.createdAt.$gte = from;
            if (to) {
                to.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = to;
            }
        }

        const userSearch =
            typeof req.query.userSearch === 'string' ? req.query.userSearch.trim().slice(0, 120) : '';
        if (userSearch) {
            const regex = new RegExp(escapeRegex(userSearch), 'i');
            const matchingUsers = await User.find({
                $or: [{ firstName: regex }, { lastName: regex }, { email: regex }],
            })
                .select('_id')
                .limit(100)
                .lean();
            const ids = matchingUsers.map((user) => user._id);
            const userClause = { $or: [{ actorUser: { $in: ids } }, { targetUser: { $in: ids } }] };
            if (filter.$or) {
                filter.$and = [{ $or: filter.$or }, userClause];
                delete filter.$or;
            } else {
                Object.assign(filter, userClause);
            }
        }

        const [items, total] = await Promise.all([
            AuditLog.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('actorUser', 'firstName lastName email')
                .populate('targetUser', 'firstName lastName email')
                .lean(),
            AuditLog.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                items,
                pagination: {
                    page,
                    limit,
                    total,
                    pages: Math.ceil(total / limit) || 1,
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

export const getAuditCatalog = async (_req, res, next) => {
    try {
        res.status(200).json({
            success: true,
            data: {
                actions: AUDIT_ACTION_VALUES,
                entityTypes: AUDIT_ENTITY_TYPES,
                roles: AUDIT_ACTOR_ROLES.filter((role) => !['admin', 'system'].includes(role)),
            },
        });
    } catch (err) {
        next(err);
    }
};
