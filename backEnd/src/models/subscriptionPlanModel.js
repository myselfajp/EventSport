import mongoose from 'mongoose';

/** Paid / free coach membership plans (Stripe later). Keys are stable. */
export const SUBSCRIPTION_PLAN_KEYS = ['basic', 'active', 'frequent', 'power'];

const subscriptionPlanSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            enum: {
                values: SUBSCRIPTION_PLAN_KEYS,
                message: 'Invalid subscription plan key',
            },
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            default: '',
            trim: true,
        },
        /** Price in TRY (major units). Basic is 0. */
        priceTry: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },
        eventCredits: {
            type: Number,
            required: true,
            min: 0,
        },
        replyCredits: {
            type: Number,
            required: true,
            min: 0,
        },
        /** Display order on Upgrade page (lower first). */
        order: {
            type: Number,
            default: 0,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        /** Optional badge e.g. "Most popular". */
        badge: {
            type: String,
            default: '',
            trim: true,
        },
        /** Future Stripe Price id (empty until Stripe is wired). */
        stripePriceId: {
            type: String,
            default: null,
            trim: true,
        },
    },
    { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, order: 1 });

export default mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
