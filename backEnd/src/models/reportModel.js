import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
    {
        reporter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        reporterIp: { type: String, trim: true, maxlength: 64 },
        targetType: {
            type: String,
            required: true,
            enum: ['user', 'coach', 'event', 'facility', 'company', 'club', 'community'],
            index: true,
        },
        targetId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            enum: [
                'impersonation',
                'fake_profile',
                'misleading_event',
                'inappropriate_content',
                'spam',
                'harassment',
                'other',
            ],
            default: null,
        },
        details: { type: String, trim: true, maxlength: 500, default: '' },
        status: {
            type: String,
            enum: ['open', 'resolved', 'dismissed'],
            default: 'open',
            index: true,
        },
        resolution: {
            action: {
                type: String,
                enum: ['none', 'user_suspended', 'event_cancelled', 'event_deleted'],
                default: null,
            },
            note: { type: String, trim: true, maxlength: 500, default: '' },
            resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
            resolvedAt: { type: Date, default: null },
        },
    },
    { timestamps: true }
);

reportSchema.index({ targetType: 1, targetId: 1, status: 1 });
reportSchema.index({ reporter: 1, targetType: 1, targetId: 1, status: 1 });

export default mongoose.model('Report', reportSchema);
