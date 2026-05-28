import mongoose from 'mongoose';

const favoriteListSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            default: null,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            default: null,
        },
    },
    { timestamps: true }
);

// Prevent duplicate rows per (user, target) while allowing the polymorphic
// schema where only one of `coach` / `facility` / `event` is populated per doc.
favoriteListSchema.index(
    { user: 1, coach: 1 },
    {
        unique: true,
        partialFilterExpression: { coach: { $type: 'objectId' } },
    }
);
favoriteListSchema.index(
    { user: 1, facility: 1 },
    {
        unique: true,
        partialFilterExpression: { facility: { $type: 'objectId' } },
    }
);
favoriteListSchema.index(
    { user: 1, event: 1 },
    {
        unique: true,
        partialFilterExpression: { event: { $type: 'objectId' } },
    }
);

// Sorted lookup of a user's favorites.
favoriteListSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('FavoriteList', favoriteListSchema);
