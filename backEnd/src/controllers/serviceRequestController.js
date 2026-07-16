import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import User from '../models/userModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember, { PERFORMANCE_BRANCHES } from '../models/performanceMemberModel.js';
import ServiceRequest from '../models/serviceRequestModel.js';
import ServiceRequestResponse from '../models/serviceRequestResponseModel.js';
import { findOrCreateConversation } from './messageController.js';
import { createNotification } from '../utils/notificationHelper.js';

const SPORTS_GOAL_OPTIONS = [
    'Just started, I don\'t have any idea what to do',
    'Beginner with few months of experience',
    'Motivating Back - I made it in the past, decided to come back',
    'I want to keep up with pre intermediates',
    'I want to keep up with intermediates',
    'I want to keep up with professionals',
    'I want to be a champion and have long term commitment',
];

const REQUEST_QUESTIONS = [
    {
        key: 'sportGroupBranch',
        question: 'Sport group and branch',
        type: 'sport_select',
        targets: ['coach'],
    },
    {
        key: 'level',
        question: 'Your level',
        type: 'level_confirm',
        targets: ['coach', 'performance'],
    },
    {
        key: 'sportsGoal',
        question: 'Your sports goal',
        type: 'single_choice',
        options: SPORTS_GOAL_OPTIONS,
        targets: ['coach', 'performance'],
    },
    {
        key: 'sessionFormat',
        question: 'Private lesson or group lesson?',
        type: 'single_choice',
        options: ['Private lesson', 'Group lesson'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'instructorGender',
        question: 'Instructor gender preference',
        type: 'single_choice',
        options: ['No preference', 'Male instructor', 'Female instructor'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'location',
        question: 'Country, city, and district',
        type: 'location',
        targets: ['coach', 'performance'],
    },
    {
        key: 'budget',
        question: 'Monthly budget',
        type: 'single_choice',
        options: ['I have set a monthly budget', 'Let me get a quote'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'availableDays',
        question: 'Which days are you available?',
        type: 'multi_choice',
        options: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'availableTimes',
        question: 'Which time slots work for you?',
        type: 'multi_choice',
        options: [
            'Morning (6am–12pm)',
            'Afternoon (12pm–5pm)',
            'Evening (5pm–9pm)',
            'Night (9pm+)',
        ],
        targets: ['coach', 'performance'],
    },
    {
        key: 'facilityPreference',
        question: 'Facility preference',
        type: 'single_choice',
        options: ['Private facility', 'Open area', 'No preference'],
        targets: ['coach', 'performance'],
    },
    {
        key: 'additionalDetails',
        question: 'Any other details?',
        type: 'textarea',
        targets: ['coach', 'performance'],
    },
    {
        key: 'emailConsent',
        question: 'Email contact consent',
        type: 'consent',
        targets: ['coach', 'performance'],
    },
];

function questionsForTarget(targetType) {
    return REQUEST_QUESTIONS.filter((q) => q.targets.includes(targetType));
}

const trim = (value, max = 1000) =>
    typeof value === 'string' ? value.trim().slice(0, max) : value;

const serviceRequestActionUrl = (tab) => `/?serviceRequests=${tab}`;
const serviceRequestFocusUrl = (requestId) =>
    `/?serviceRequests=mine&requestId=${requestId}`;

function normalizeAnswers(input, targetType) {
    const catalog = questionsForTarget(targetType);
    const byKey = new Map();
    if (Array.isArray(input)) {
        for (const item of input) {
            if (item?.key) byKey.set(item.key, item.answer ?? '');
        }
    } else if (input && typeof input === 'object') {
        for (const [key, value] of Object.entries(input)) byKey.set(key, value);
    }

    const answers = catalog.map((q) => {
        const raw = byKey.get(q.key);
        const answer =
            Array.isArray(raw) ? raw.map((v) => trim(String(v), 200)).join(', ') : trim(raw ?? '', 1000);
        if (!answer) {
            throw new AppError(400, `${q.question} is required.`);
        }
        if (q.key === 'emailConsent') {
            const normalized = answer.toLowerCase();
            const accepted =
                normalized.startsWith('yes') ||
                ['true', 'accepted', 'i agree'].includes(normalized);
            if (!accepted) {
                throw new AppError(400, 'Email contact consent is required.');
            }
        }
        return {
            key: q.key,
            question: q.question,
            answer,
        };
    });

    return answers;
}

async function getProviderProfile(user, targetType = null) {
    if (!user) throw new AppError(401);

    if ((!targetType || targetType === 'coach') && user.coach) {
        const approvedBranchCount = await Branch.countDocuments({
            coach: user.coach,
            status: 'Approved',
        });
        if (approvedBranchCount > 0) {
            return { providerType: 'coach', coach: user.coach, performanceMember: null };
        }
    }

    if ((!targetType || targetType === 'performance') && user.performanceMember) {
        const performanceMember = await PerformanceMember.findById(user.performanceMember);
        if (performanceMember?.isVerified && performanceMember.status === 'Approved') {
            return {
                providerType: 'performance',
                coach: null,
                performanceMember,
            };
        }
    }

    throw new AppError(403, 'Approved coach or Performance Team profile is required.');
}

async function getProviderUserIdsForRequest(request) {
    if (request.targetType === 'coach') {
        const approvedCoachIds = await Branch.distinct('coach', { status: 'Approved' });
        if (!approvedCoachIds.length) return [];

        const users = await User.find({
            coach: { $in: approvedCoachIds },
            isActive: { $ne: false },
            _id: { $ne: request.requester },
        })
            .select('_id')
            .lean();
        return users.map((user) => user._id);
    }

    const members = await PerformanceMember.find({
        branch: request.performanceBranch,
        status: 'Approved',
        isVerified: true,
        user: { $ne: request.requester },
    })
        .select('user')
        .lean();

    return members.map((member) => member.user).filter(Boolean);
}

function serviceTargetLabel(request) {
    if (request.targetType === 'coach') return 'coaching';
    return `${request.performanceBranch || 'performance'} support`;
}

async function notifyProvidersOfServiceRequest(request) {
    const providerUserIds = await getProviderUserIdsForRequest(request);
    if (!providerUserIds.length) return null;

    return createNotification({
        scope: 'group',
        type: 'service_request_created',
        title: 'New service request',
        message: `A new ${serviceTargetLabel(request)} service request is available. Would you like to review it?`,
        data: {
            serviceRequestId: request._id,
            targetType: request.targetType,
            performanceBranch: request.performanceBranch || null,
        },
        targetUsers: providerUserIds,
        priority: 'normal',
        icon: 'users',
        actionUrl: serviceRequestActionUrl('incoming'),
        createdBy: request.requester,
    });
}

async function notifyRequesterOfProviderInterest(request, providerUser) {
    const providerName = `${providerUser?.firstName || ''} ${providerUser?.lastName || ''}`.trim();
    return createNotification({
        scope: 'user',
        type: 'service_request_response_received',
        title: 'Someone is interested in your request',
        message: `${providerName || 'A provider'} is interested in your service request.`,
        data: {
            serviceRequestId: request._id,
            providerUserId: providerUser?._id,
        },
        userId: request.requester,
        priority: 'normal',
        icon: 'bell',
        actionUrl: serviceRequestFocusUrl(request._id),
        createdBy: providerUser?._id,
    });
}

export const getQuestionCatalog = async (_req, res, next) => {
    try {
        res.status(200).json({ success: true, data: REQUEST_QUESTIONS });
    } catch (err) {
        next(err);
    }
};

export const createServiceRequest = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);
        if (!req.user.participant) {
            throw new AppError(403, 'Gamer profile is required to create a service request.');
        }

        const targetType = trim(req.body?.targetType, 32);
        if (!['coach', 'performance'].includes(targetType)) {
            throw new AppError(400, 'Invalid service request target.');
        }

        const performanceBranch = trim(req.body?.performanceBranch, 64);
        if (targetType === 'performance' && !PERFORMANCE_BRANCHES.includes(performanceBranch)) {
            throw new AppError(400, 'Invalid performance branch.');
        }

        const request = await ServiceRequest.create({
            requester: req.user._id,
            participant: req.user.participant,
            targetType,
            performanceBranch: targetType === 'performance' ? performanceBranch : undefined,
            title:
                trim(req.body?.title, 160) ||
                (targetType === 'coach' ? 'Coach Me' : `${performanceBranch} service request`),
            answers: normalizeAnswers(req.body?.answers, targetType),
        });

        void notifyProvidersOfServiceRequest(request).catch((notifErr) =>
            console.error('notifyProvidersOfServiceRequest failed:', notifErr)
        );

        res.status(201).json({ success: true, data: request });
    } catch (err) {
        next(err);
    }
};

export const listMyRequests = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const requests = await ServiceRequest.find({ requester: req.user._id })
            .sort({ createdAt: -1 })
            .lean();

        const responsesByRequest = await ServiceRequestResponse.find({
            serviceRequest: { $in: requests.map((r) => r._id) },
            status: { $ne: 'withdrawn' },
        })
            .populate('providerUser', 'firstName lastName photo')
            .populate('coach', 'name isVerified about')
            .populate('performanceMember', 'name branch title about isVerified')
            .sort({ createdAt: -1 })
            .lean();

        const grouped = new Map();
        for (const response of responsesByRequest) {
            const key = String(response.serviceRequest);
            grouped.set(key, [...(grouped.get(key) || []), response]);
        }

        res.status(200).json({
            success: true,
            data: requests.map((request) => ({
                ...request,
                responses: grouped.get(String(request._id)) || [],
            })),
        });
    } catch (err) {
        next(err);
    }
};

export const listIncomingRequests = async (req, res, next) => {
    try {
        const providerProfiles = [];

        try {
            providerProfiles.push(await getProviderProfile(req.user, 'coach'));
        } catch {
        }
        try {
            providerProfiles.push(await getProviderProfile(req.user, 'performance'));
        } catch {
        }
        if (providerProfiles.length === 0) {
            throw new AppError(403, 'Approved coach or Performance Team profile is required.');
        }

        const or = providerProfiles.map((provider) =>
            provider.providerType === 'coach'
                ? { targetType: 'coach' }
                : {
                    targetType: 'performance',
                    performanceBranch: provider.performanceMember.branch,
                }
        );

        const requests = await ServiceRequest.find({
            status: 'open',
            expiresAt: { $gt: new Date() },
            $or: or,
        })
            .populate('requester', 'firstName lastName photo')
            .sort({ createdAt: -1 })
            .lean();

        const myResponses = await ServiceRequestResponse.find({
            serviceRequest: { $in: requests.map((r) => r._id) },
            providerUser: req.user._id,
        }).lean();
        const responseMap = new Map(myResponses.map((r) => [String(r.serviceRequest), r]));

        res.status(200).json({
            success: true,
            data: requests.map((request) => ({
                ...request,
                myResponse: responseMap.get(String(request._id)) || null,
            })),
        });
    } catch (err) {
        next(err);
    }
};

export const respondToRequest = async (req, res, next) => {
    try {
        const requestId = mongoObjectId.parse(req.params.requestId);

        const request = await ServiceRequest.findById(requestId);
        if (!request) throw new AppError(404, 'Service request not found.');
        if (request.status !== 'open') throw new AppError(400, 'Service request is not open.');
        if (request.expiresAt && request.expiresAt < new Date()) {
            throw new AppError(400, 'Service request has expired.');
        }
        if (String(request.requester) === String(req.user._id)) {
            throw new AppError(400, 'You cannot respond to your own service request.');
        }
        const provider = await getProviderProfile(req.user, request.targetType);
        if (
            provider.providerType === 'performance' &&
            provider.performanceMember.branch !== request.performanceBranch
        ) {
            throw new AppError(403, 'This request is for another Performance Team branch.');
        }

        const existingResponse = await ServiceRequestResponse.findOne({
            serviceRequest: request._id,
            providerUser: req.user._id,
        }).lean();

        const response = await ServiceRequestResponse.findOneAndUpdate(
            { serviceRequest: request._id, providerUser: req.user._id },
            {
                serviceRequest: request._id,
                providerUser: req.user._id,
                providerType: provider.providerType,
                coach: provider.coach,
                performanceMember:
                    provider.providerType === 'performance'
                        ? provider.performanceMember._id
                        : null,
                message: trim(req.body?.message, 1000) || '',
                status: 'interested',
                selectedAt: null,
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        if (!existingResponse || existingResponse.status !== 'interested') {
            void notifyRequesterOfProviderInterest(request, req.user).catch((notifErr) =>
                console.error('notifyRequesterOfProviderInterest failed:', notifErr)
            );
        }

        res.status(200).json({ success: true, data: response });
    } catch (err) {
        next(err);
    }
};

export const selectResponse = async (req, res, next) => {
    try {
        if (!req.user) throw new AppError(401);

        const requestId = mongoObjectId.parse(req.params.requestId);
        const responseId = mongoObjectId.parse(req.params.responseId);

        const request = await ServiceRequest.findById(requestId);
        if (!request) throw new AppError(404, 'Service request not found.');
        if (String(request.requester) !== String(req.user._id)) {
            throw new AppError(403, 'Only the requester can choose a provider.');
        }

        const response = await ServiceRequestResponse.findOne({
            _id: responseId,
            serviceRequest: request._id,
            status: 'interested',
        });
        if (!response) throw new AppError(404, 'Service request response not found.');

        await ServiceRequestResponse.updateMany(
            { serviceRequest: request._id, _id: { $ne: response._id }, status: 'interested' },
            { status: 'rejected' }
        );

        response.status = 'selected';
        response.selectedAt = new Date();
        await response.save();

        request.status = 'in_conversation';
        request.selectedResponse = response._id;
        request.selectedProvider = response.providerUser;
        request.selectedAt = new Date();
        await request.save();

        const providerUser = await User.findById(response.providerUser).select('_id');
        if (!providerUser) throw new AppError(404, 'Provider user not found.');

        const conversation = await findOrCreateConversation(req.user._id, providerUser._id);

        res.status(200).json({
            success: true,
            data: {
                request,
                response,
                conversation,
            },
        });
    } catch (err) {
        next(err);
    }
};
