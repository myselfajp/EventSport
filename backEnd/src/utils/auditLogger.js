import { randomUUID } from 'node:crypto';
import AuditLog from '../models/auditLogModel.js';

const SENSITIVE_KEY =
    /password|passcode|token|secret|otp|authorization|cookie|certificate|content|message/i;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 2000;

function sanitizeValue(value, depth = 0) {
    if (value == null) return value;
    if (depth > 5) return '[truncated]';
    if (typeof value === 'string') return value.slice(0, MAX_STRING_LENGTH);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
        return value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1));
    }
    if (typeof value?.toHexString === 'function') return value.toHexString();
    if (typeof value === 'object') {
        const plain = typeof value.toObject === 'function' ? value.toObject() : value;
        return Object.fromEntries(
            Object.entries(plain)
                .filter(([key]) => !SENSITIVE_KEY.test(key))
                .map(([key, item]) => [key, sanitizeValue(item, depth + 1)])
        );
    }
    return String(value).slice(0, MAX_STRING_LENGTH);
}

function requestMeta(req) {
    const forwarded = req?.headers?.['x-forwarded-for'];
    const ipAddress =
        typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : req?.ip || req?.socket?.remoteAddress || null;
    const suppliedRequestId = req?.headers?.['x-request-id'];
    return {
        ipAddress,
        userAgent:
            typeof req?.headers?.['user-agent'] === 'string'
                ? req.headers['user-agent'].slice(0, 500)
                : null,
        requestId:
            typeof suppliedRequestId === 'string'
                ? suppliedRequestId.slice(0, 100)
                : randomUUID(),
    };
}

/**
 * Append a business audit event. Passwords, tokens, message bodies, certificates,
 * and similarly sensitive keys are stripped recursively before persistence.
 */
export async function writeAuditLog({
    req,
    actorUserId,
    actorRole,
    targetUserId = null,
    targetRole = null,
    action,
    entityType,
    entityId = null,
    description = '',
    changedFields = [],
    before = null,
    after = null,
    metadata = {},
}) {
    try {
        return await AuditLog.create({
            actorUser: actorUserId || req?.user?._id || null,
            actorRole,
            targetUser: targetUserId,
            targetRole,
            action,
            entityType,
            entityId,
            description: String(description || '').slice(0, 500),
            changedFields: Array.from(new Set(changedFields.filter(Boolean))).slice(0, 100),
            before: sanitizeValue(before),
            after: sanitizeValue(after),
            metadata: sanitizeValue(metadata) || {},
            ...requestMeta(req),
        });
    } catch (err) {
        console.error('Business audit write failed:', {
            action,
            entityType,
            entityId: entityId?.toString?.() || null,
            error: err?.message,
        });
        if (process.env.AUDIT_LOG_STRICT === 'true') throw err;
        return null;
    }
}

export function changedKeys(before = {}, after = {}, allowedKeys = []) {
    return allowedKeys.filter((key) => {
        const left = sanitizeValue(before?.[key]);
        const right = sanitizeValue(after?.[key]);
        return JSON.stringify(left) !== JSON.stringify(right);
    });
}

export function auditRoleForUser(user, fallback = 'athlete') {
    if (user?.role === 0) return 'admin';
    if (user?.coach) return 'coach';
    if (user?.performanceMember) return 'performance';
    return fallback;
}
