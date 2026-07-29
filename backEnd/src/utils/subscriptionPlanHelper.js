import SubscriptionPlan from '../models/subscriptionPlanModel.js';
import Coach from '../models/coachModel.js';
import { AppError } from './appError.js';

export const DEFAULT_BASIC_CREDITS = {
    subscriptionTier: 'basic',
    eventCredits: 4,
    replyCredits: 3,
};

/** Max coach/performance offers per service request (Hakan rule). */
export const MAX_OFFERS_PER_SERVICE_REQUEST = 10;

/**
 * Fields to assign when a coach profile is first created (Basic plan).
 */
export async function getBasicPlanAssignmentFields() {
    const plan = await SubscriptionPlan.findOne({ key: 'basic' }).lean();
    if (!plan) {
        return { ...DEFAULT_BASIC_CREDITS };
    }
    return {
        subscriptionTier: 'basic',
        eventCredits: plan.eventCredits,
        replyCredits: plan.replyCredits,
    };
}

/**
 * Apply a plan to a coach document (in-memory). Does not save.
 * mode 'replace' — set tier + set credits from plan (new coach / reset).
 * mode 'addCredits' — set tier + add plan credits to remaining (upgrade carry-over).
 */
export function applyPlanToCoachDoc(coach, plan, { mode = 'replace' } = {}) {
    if (!coach || !plan) return coach;
    coach.subscriptionTier = plan.key;
    if (mode === 'addCredits') {
        coach.eventCredits = (Number(coach.eventCredits) || 0) + Number(plan.eventCredits || 0);
        coach.replyCredits = (Number(coach.replyCredits) || 0) + Number(plan.replyCredits || 0);
    } else {
        coach.eventCredits = Number(plan.eventCredits) || 0;
        coach.replyCredits = Number(plan.replyCredits) || 0;
    }
    return coach;
}

export async function findPlanByKey(key) {
    return SubscriptionPlan.findOne({ key: String(key).toLowerCase().trim() });
}

/**
 * Atomically consume one credit. Throws 403 if none left.
 * @param {'eventCredits'|'replyCredits'} field
 */
export async function consumeCoachCredit(coachId, field) {
    if (field !== 'eventCredits' && field !== 'replyCredits') {
        throw new AppError(500, 'Invalid credit field');
    }

    const updated = await Coach.findOneAndUpdate(
        { _id: coachId, [field]: { $gt: 0 } },
        { $inc: { [field]: -1 } },
        { new: true }
    );

    if (!updated) {
        const coach = await Coach.findById(coachId).select(field).lean();
        if (!coach) throw new AppError(404, 'Coach profile not found.');
        const kind = field === 'eventCredits' ? 'event' : 'request reply';
        throw new AppError(
            403,
            `No ${kind} credits left on your plan. Upgrade your membership to continue.`
        );
    }

    return updated;
}

export async function refundCoachCredit(coachId, field) {
    if (!coachId || (field !== 'eventCredits' && field !== 'replyCredits')) return;
    await Coach.findByIdAndUpdate(coachId, { $inc: { [field]: 1 } });
}

/**
 * Apply plan to coach by id and save (carry-over or replace).
 */
export async function applyPlanToCoachById(coachId, planKey, { mode = 'addCredits' } = {}) {
    const plan = await findPlanByKey(planKey);
    if (!plan || !plan.isActive) {
        throw new AppError(404, 'Subscription plan not found or inactive.');
    }

    const coach = await Coach.findById(coachId);
    if (!coach) throw new AppError(404, 'Coach profile not found.');

    applyPlanToCoachDoc(coach, plan, { mode });
    await coach.save();
    return coach;
}
