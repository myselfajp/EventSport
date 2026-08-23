import mongoose from 'mongoose';
import {
    AUDIT_ACTION_VALUES,
    AUDIT_ACTOR_ROLES,
    AUDIT_ENTITY_TYPES,
} from '../constants/auditActions.js';

const auditLogSchema = new mongoose.Schema(
    {
        actorUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        actorRole: {
            type: String,
            enum: AUDIT_ACTOR_ROLES,
            required: true,
            index: true,
        },
        targetUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        targetRole: {
            type: String,
            enum: AUDIT_ACTOR_ROLES.filter((role) => role !== 'system'),
            default: null,
            index: true,
        },
        action: {
            type: String,
            enum: AUDIT_ACTION_VALUES,
            required: true,
            index: true,
        },
        entityType: {
            type: String,
            enum: AUDIT_ENTITY_TYPES,
            required: true,
            index: true,
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
            index: true,
        },
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
        changedFields: {
            type: [String],
            default: [],
        },
        before: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        after: {
            type: mongoose.Schema.Types.Mixed,
            default: null,
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        ipAddress: {
            type: String,
            trim: true,
            maxlength: 128,
            default: null,
        },
        userAgent: {
            type: String,
            trim: true,
            maxlength: 500,
            default: null,
        },
        requestId: {
            type: String,
            trim: true,
            maxlength: 100,
            default: null,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        versionKey: false,
    }
);

auditLogSchema.index({ actorRole: 1, createdAt: -1 });
auditLogSchema.index({ targetRole: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
