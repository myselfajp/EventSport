import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import User from '../models/userModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember, { PERFORMANCE_BRANCHES } from '../models/performanceMemberModel.js';
import ServiceRequest from '../models/serviceRequestModel.js';
import ServiceRequestResponse from '../models/serviceRequestResponseModel.js';
import { findOrCreateConversation } from './messageController.js';

const REQUEST_QUESTIONS = [
    { key: 'skillLevel', question: 'What is your current skill level?' },
    { key: 'goal', question: 'What goal do you want to achieve?' },
    { key: 'sessionFormat', question: 'Do you prefer private sessions or group sessions?' },
    { key: 'locationPreference', question: 'Where would you like to receive the service?' },
    { key: 'budget', question: 'Do you have a budget, and if so, how much?' },
    { key: 'availability', question: 'Which days and times are you available?' },
    { key: 'experience', question: 'Have you received support in this area before?' },
    { key: 'duration', question: 'How long do you want to receive support?' },
    { key: 'communicationPreference', question: 'Do you prefer online or in-person sessions?' },
    { key: 'notes', question: 'Is there anything else you want to add?' },
];

const trim = (value, max = 1000) =>
    typeof value === 'string' ? value.trim().slice(0, max) : value;

function normalizeAnswers(input) {
    const byKey = new Map();
    if (Array.isArray(input)) {
        for (const item of input) {
            if (item?.key) byKey.set(item.key, item.answer ?? '');
        }
    } else if (input && typeof input === 'object') {
        for (const [key, value] of Object.entries(input)) byKey.set(key, value);
    }

    return REQUEST_QUESTIONS.map((q) => ({
        ...q,
        answer: trim(byKey.get(q.key) ?? '', 1000),
    }));
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
            title: trim(req.body?.title, 160) || '',
            answers: normalizeAnswers(req.body?.answers),
        });

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
