import SubscriptionPlan from '../models/subscriptionPlanModel.js';
import Coach from '../models/coachModel.js';
import { DEFAULT_BASIC_CREDITS } from './subscriptionPlanHelper.js';

const DEFAULT_PLANS = [
    {
        key: 'basic',
        name: 'Basic',
        description: 'Free starter plan for new coaches.',
        priceTry: 0,
        eventCredits: 4,
        replyCredits: 3,
        order: 1,
        isActive: true,
        badge: '',
    },
    {
        key: 'active',
        name: 'Active',
        description: 'More events and request replies for growing coaches.',
        priceTry: 2000,
        eventCredits: 8,
        replyCredits: 6,
        order: 2,
        isActive: true,
        badge: '',
    },
    {
        key: 'frequent',
        name: 'Frequent',
        description: 'Higher monthly capacity for active coaches.',
        priceTry: 4000,
        eventCredits: 12,
        replyCredits: 10,
        order: 3,
        isActive: true,
        badge: 'Most popular',
    },
    {
        key: 'power',
        name: 'Power',
        description: 'Maximum event and reply capacity.',
        priceTry: 6000,
        eventCredits: 16,
        replyCredits: 20,
        order: 4,
        isActive: true,
        badge: '',
    },
];

/**
 * Seed default subscription plans and backfill existing coaches without a tier.
 */
export const initSubscriptionPlans = async () => {
    try {
        for (const plan of DEFAULT_PLANS) {
            const existing = await SubscriptionPlan.findOne({ key: plan.key });
            if (!existing) {
                await SubscriptionPlan.create(plan);
                console.log(`✅ Subscription plan created: ${plan.key}`);
            }
        }

        const basic = await SubscriptionPlan.findOne({ key: 'basic' }).lean();
        const fields = basic
            ? {
                  subscriptionTier: 'basic',
                  eventCredits: basic.eventCredits,
                  replyCredits: basic.replyCredits,
              }
            : { ...DEFAULT_BASIC_CREDITS };

        const result = await Coach.updateMany(
            {
                $or: [
                    { subscriptionTier: { $exists: false } },
                    { subscriptionTier: null },
                    { subscriptionTier: '' },
                ],
            },
            {
                $set: {
                    subscriptionTier: fields.subscriptionTier,
                    eventCredits: fields.eventCredits,
                    replyCredits: fields.replyCredits,
                },
            }
        );

        if (result.modifiedCount > 0) {
            console.log(
                `✅ Assigned Basic subscription to ${result.modifiedCount} existing coach(es)`
            );
        }
    } catch (err) {
        console.error('❌ initSubscriptionPlans failed:', err.message);
    }
};
