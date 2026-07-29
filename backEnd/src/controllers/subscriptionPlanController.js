import { z } from 'zod';
import SubscriptionPlan, { SUBSCRIPTION_PLAN_KEYS } from '../models/subscriptionPlanModel.js';
import User from '../models/userModel.js';
import { AppError } from '../utils/appError.js';
import { applyPlanToCoachById } from '../utils/subscriptionPlanHelper.js';
import { mongoObjectId } from '../utils/validation.js';

const updatePlanSchema = z.object({
    name: z.string().trim().min(1).max(80).optional(),
    description: z.string().trim().max(2000).optional(),
    priceTry: z.number().min(0).optional(),
    eventCredits: z.number().int().min(0).optional(),
    replyCredits: z.number().int().min(0).optional(),
    order: z.number().int().optional(),
    isActive: z.boolean().optional(),
    badge: z.string().trim().max(80).optional(),
    stripePriceId: z
        .union([z.string().trim().max(200), z.null()])
        .optional(),
});

/** Public catalog for Upgrade page (active plans only). */
export const listPublicPlans = async (req, res, next) => {
    try {
        const plans = await SubscriptionPlan.find({ isActive: true })
            .sort({ order: 1, priceTry: 1 })
            .select('-__v -stripePriceId')
            .lean();

        res.status(200).json({
            success: true,
            data: plans,
        });
    } catch (err) {
        next(err);
    }
};

/** Admin: all plans including inactive. */
export const listAdminPlans = async (req, res, next) => {
    try {
        const plans = await SubscriptionPlan.find()
            .sort({ order: 1, priceTry: 1 })
            .select('-__v')
            .lean();

        res.status(200).json({
            success: true,
            data: plans,
        });
    } catch (err) {
        next(err);
    }
};

export const getAdminPlanById = async (req, res, next) => {
    try {
        const plan = await SubscriptionPlan.findById(req.params.planId).select('-__v');
        if (!plan) throw new AppError(404, 'Subscription plan not found');

        res.status(200).json({
            success: true,
            data: plan,
        });
    } catch (err) {
        next(err);
    }
};

export const updateAdminPlan = async (req, res, next) => {
    try {
        const body = { ...req.body };
        if (body.priceTry !== undefined) body.priceTry = Number(body.priceTry);
        if (body.eventCredits !== undefined) body.eventCredits = Number(body.eventCredits);
        if (body.replyCredits !== undefined) body.replyCredits = Number(body.replyCredits);
        if (body.order !== undefined) body.order = Number(body.order);

        const parsed = updatePlanSchema.parse(body);

        const plan = await SubscriptionPlan.findById(req.params.planId);
        if (!plan) throw new AppError(404, 'Subscription plan not found');

        if (!SUBSCRIPTION_PLAN_KEYS.includes(plan.key)) {
            throw new AppError(400, 'Invalid plan');
        }

        // Basic stays free for Phase 1 product rules
        if (plan.key === 'basic' && parsed.priceTry !== undefined && parsed.priceTry !== 0) {
            throw new AppError(400, 'Basic plan price must remain 0.');
        }

        Object.assign(plan, parsed);
        await plan.save();

        res.status(200).json({
            success: true,
            message: 'Subscription plan updated',
            data: plan,
        });
    } catch (err) {
        next(err);
    }
};

const applyPlanSchema = z.object({
    planKey: z.enum(['basic', 'active', 'frequent', 'power']),
    /** addCredits = upgrade carry-over (default). replace = reset credits to plan amounts. */
    mode: z.enum(['addCredits', 'replace']).default('addCredits'),
});

/**
 * Admin test helper until Stripe: apply a plan to a coach user with credit carry-over.
 * POST /admin/users/:userId/apply-subscription-plan
 */
export const applyPlanToUserCoach = async (req, res, next) => {
    try {
        const userId = mongoObjectId.parse(req.params.userId);
        const { planKey, mode } = applyPlanSchema.parse(req.body || {});

        const user = await User.findById(userId).select('coach');
        if (!user?.coach) {
            throw new AppError(404, 'User has no coach profile.');
        }

        const coach = await applyPlanToCoachById(user.coach, planKey, { mode });

        res.status(200).json({
            success: true,
            message: `Applied ${planKey} plan (${mode})`,
            data: {
                subscriptionTier: coach.subscriptionTier,
                eventCredits: coach.eventCredits,
                replyCredits: coach.replyCredits,
            },
        });
    } catch (err) {
        next(err);
    }
};
