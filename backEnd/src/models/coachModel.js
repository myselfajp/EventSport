import mongoose from 'mongoose';

const coachSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Name is required'],
        },
        membershipLevel: {
            type: String,
            default: null,
            enum: {
                values: ['Gold', 'Platinum', 'Bronze', 'Silver'],
                message: 'Should be Gold, Platinum, Bronze, Silver',
            },
        },
        point: {
            type: Number,
            default: null,
            max: [10, 'Must be less than 10'],
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        about: {
            type: String,
            default: '',
        },
        /** Cached average from gamer star ratings (1–5). */
        ratingAverage: {
            type: Number,
            default: null,
            min: [1, 'Must be at least 1'],
            max: [5, 'Must be at most 5'],
        },
        ratingCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        /**
         * Paid membership tier (separate from legacy membershipLevel badge).
         * basic | active | frequent | power
         */
        subscriptionTier: {
            type: String,
            default: 'basic',
            enum: {
                values: ['basic', 'active', 'frequent', 'power'],
                message: 'Invalid subscription tier',
            },
        },
        /** Remaining event-create credits (carry-over on upgrade; not monthly reset). */
        eventCredits: {
            type: Number,
            default: 0,
            min: 0,
        },
        /** Remaining service-request reply credits. */
        replyCredits: {
            type: Number,
            default: 0,
            min: 0,
        },
        /** Stripe ids — filled when payment is wired. */
        stripeCustomerId: {
            type: String,
            default: null,
        },
        stripeSubscriptionId: {
            type: String,
            default: null,
        },
    },
    { timestamps: true }
);
export default mongoose.model('Coach', coachSchema);
