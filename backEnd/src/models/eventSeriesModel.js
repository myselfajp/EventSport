import mongoose from 'mongoose';

const eventSeriesSchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: { type: String, required: true, trim: true },
        frequency: {
            type: String,
            enum: ['weekly', 'daily', 'monthly'],
            required: true,
        },
        interval: {
            type: Number,
            required: true,
            min: 1,
            max: 30,
            default: 1,
        },
        sessionCount: {
            type: Number,
            required: true,
            min: 2,
            max: 52,
        },
        /** Duration of each session (ms) — derived from first session end - start. */
        sessionDurationMs: { type: Number, required: true },
        anchorStartTime: { type: Date, required: true },
        listingOrder: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'CoachListingOrder',
        },
        private: { type: Boolean, default: false },
        secretId: { type: String, default: null, select: false },
        status: {
            type: String,
            enum: ['active', 'cancelled'],
            default: 'active',
        },
        /** Per-session gamer fee at time of creation (for series enrollment pricing). */
        participationFeePerSession: { type: Number, default: 0 },
        priceType: {
            type: String,
            enum: ['Manual', 'Stable', 'Free'],
            default: 'Free',
        },
    },
    { timestamps: true }
);

export default mongoose.model('EventSeries', eventSeriesSchema);
