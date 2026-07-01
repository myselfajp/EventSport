import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        toCompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
        },
        toFacility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
        },
        toCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
        },
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

commentSchema.index(
    { fromUser: 1, toCoach: 1 },
    { unique: true, partialFilterExpression: { toCoach: { $type: 'objectId' } } }
);
commentSchema.index({ toCoach: 1, createdAt: -1 });

export default mongoose.model('Comment', commentSchema);
