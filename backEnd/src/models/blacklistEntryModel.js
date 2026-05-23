import mongoose from 'mongoose';

const blacklistEntrySchema = new mongoose.Schema(
    {
        type: {
            type: String,
            enum: ['email', 'phone', 'userId'],
            required: true,
        },
        value: {
            type: String,
            required: true,
            trim: true,
        },
        reason: {
            type: String,
            default: '',
            trim: true,
        },
        linkedUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { timestamps: true }
);

blacklistEntrySchema.index({ type: 1, value: 1 }, { unique: true });
blacklistEntrySchema.index({ linkedUser: 1 });
blacklistEntrySchema.index({ createdAt: -1 });

const BlacklistEntry =
    mongoose.models.BlacklistEntry || mongoose.model('BlacklistEntry', blacklistEntrySchema);

export default BlacklistEntry;
