import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import User from '../models/userModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember, { PERFORMANCE_BRANCHES } from '../models/performanceMemberModel.js';
import ServiceRequest from '../models/serviceRequestModel.js';
import ServiceRequestResponse from '../models/serviceRequestResponseModel.js';
import { findOrCreateConversation } from './messageController.js';
import { createNotification } from '../utils/notificationHelper.js';
import {
    MAX_OFFERS_PER_SERVICE_REQUEST,
    consumeCoachCredit,
    refundCoachCredit,
    consumePerformanceCredit,
    refundPerformanceCredit,
} from '../utils/subscriptionPlanHelper.js';
import {
    REQUEST_QUESTIONS,
    questionsForTarget,
} from '../constants/serviceRequestQuestions.js';
import { writeAuditLog } from '../utils/auditLogger.js';
import { AUDIT_ACTIONS } from '../constants/auditActions.js';

const trim = (value, max = 1000) =>
    typeof value === 'string' ? value.trim().slice(0, max) : value;

const serviceRequestActionUrl = (tab, requestId = null) => {
    const params = new URLSearchParams({ serviceRequests: tab });
    if (requestId) params.set('requestId', String(requestId));
    return `/?${params.toString()}`;
};
const serviceRequestFocusUrl = (requestId, tab = 'mine') =>
    serviceRequestActionUrl(tab, requestId);

function normalizeAnswers(input, targetType, performanceBranch = null) {
    const catalog = questionsForTarget(targetType, performanceBranch);
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

function resolveCoachId(user) {
    if (!user?.coach) return null;
    return user.coach._id || user.coach;
}

async function getProviderProfile(user, targetType = null) {
    if (!user) throw new AppError(401);

    // Coaches: any coach profile can see/respond (reply credits still gate new offers).
    // Approved-branch check is used for notifications, not for Incoming visibility.
    if ((!targetType || targetType === 'coach') && user.coach) {
        const coachId = resolveCoachId(user);
        if (coachId) {
            return { providerType: 'coach', coach: coachId, performanceMember: null };
        }
    }

    if ((!targetType || targetType === 'performance') && user.performanceMember) {
        const performanceMemberId =
            user.performanceMember._id || user.performanceMember;
        const performanceMember = await PerformanceMember.findById(performanceMemberId);
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
        actionUrl: serviceRequestActionUrl('incoming', request._id),
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
            throw new AppError(403, 'Athlete profile is required to create a service request.');
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
            answers: normalizeAnswers(
                req.body?.answers,
                targetType,
                targetType === 'performance' ? performanceBranch : null
            ),
        });

        await writeAuditLog({
            req,
            actorRole: 'athlete',
            action: AUDIT_ACTIONS.SERVICE_REQUEST_CREATED,
            entityType: 'service_request',
            entityId: request._id,
            description:
                targetType === 'coach'
                    ? 'Coach Me request created'
                    : 'Performance Team service request created',
            metadata: {
                targetType,
                performanceBranch: request.performanceBranch,
                expiresAt: request.expiresAt,
            },
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

        // Open matching requests + any request this provider already responded to
        // (so "Responded" stays visible for coaches the same way as Performance Team).
        const myResponses = await ServiceRequestResponse.find({
            providerUser: req.user._id,
            status: { $ne: 'withdrawn' },
        }).lean();
        const respondedIds = myResponses.map((r) => r.serviceRequest);

        const requests = await ServiceRequest.find({
            $or: [
                {
                    status: 'open',
                    expiresAt: { $gt: new Date() },
                    $or: or,
                },
                ...(respondedIds.length
                    ? [{ _id: { $in: respondedIds }, $or: or }]
                    : []),
            ],
        })
            .populate('requester', 'firstName lastName photo')
            .sort({ createdAt: -1 })
            .lean();

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
        if (request.status === 'inactive') {
            throw new AppError(
                400,
                'This request already has the maximum number of offers and is no longer accepting responses.'
            );
        }
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

        const isNewOffer = !existingResponse;

        if (isNewOffer) {
            const offerCount = await ServiceRequestResponse.countDocuments({
                serviceRequest: request._id,
                status: { $in: ['interested', 'selected'] },
            });
            if (offerCount >= MAX_OFFERS_PER_SERVICE_REQUEST) {
                if (request.status === 'open') {
                    request.status = 'inactive';
                    await request.save();
                }
                throw new AppError(
                    400,
                    `This request already has ${MAX_OFFERS_PER_SERVICE_REQUEST} offers and cannot accept more.`
                );
            }
        }

        const providerIdForCredits =
            provider.providerType === 'coach'
                ? provider.coach?._id || provider.coach || req.user.coach?._id || req.user.coach
                : provider.performanceMember?._id || provider.performanceMember;
        let consumedReplyCredit = false;
        let consumedCreditType = null;
        if (isNewOffer && providerIdForCredits) {
            if (provider.providerType === 'coach') {
                await consumeCoachCredit(providerIdForCredits, 'replyCredits');
                consumedCreditType = 'coach';
            } else {
                await consumePerformanceCredit(providerIdForCredits, 'replyCredits');
                consumedCreditType = 'performance';
            }
            consumedReplyCredit = true;
        }

        let response;
        try {
            response = await ServiceRequestResponse.findOneAndUpdate(
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
        } catch (writeErr) {
            if (consumedReplyCredit && providerIdForCredits) {
                if (consumedCreditType === 'performance') {
                    await refundPerformanceCredit(providerIdForCredits, 'replyCredits');
                } else {
                    await refundCoachCredit(providerIdForCredits, 'replyCredits');
                }
            }
            throw writeErr;
        }

        if (isNewOffer) {
            const offerCountAfter = await ServiceRequestResponse.countDocuments({
                serviceRequest: request._id,
                status: { $in: ['interested', 'selected'] },
            });
            if (offerCountAfter >= MAX_OFFERS_PER_SERVICE_REQUEST) {
                request.status = 'inactive';
                await request.save();
            }
        }

        if (!existingResponse || existingResponse.status !== 'interested') {
            void notifyRequesterOfProviderInterest(request, req.user).catch((notifErr) =>
                console.error('notifyRequesterOfProviderInterest failed:', notifErr)
            );
        }

        if (isNewOffer) {
            await writeAuditLog({
                req,
                actorRole: provider.providerType,
                targetUserId: request.requester,
                targetRole: 'athlete',
                action: AUDIT_ACTIONS.SERVICE_RESPONSE_CREATED,
                entityType: 'service_response',
                entityId: response._id,
                description: 'Provider responded to a service request',
                metadata: {
                    serviceRequestId: request._id,
                    providerType: provider.providerType,
                    replyCreditConsumed: consumedReplyCredit,
                },
            });
            if (consumedReplyCredit) {
                await writeAuditLog({
                    req,
                    actorRole: provider.providerType,
                    action: AUDIT_ACTIONS.REPLY_CREDIT_CONSUMED,
                    entityType: 'subscription',
                    entityId: providerIdForCredits,
                    description: 'Reply credit consumed for a service request response',
                    metadata: {
                        serviceRequestId: request._id,
                        serviceResponseId: response._id,
                        amount: 1,
                    },
                });
            }
        }
        res.status(200).json({
            success: true,
            data: response,
            requestStatus: request.status,
        });
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
            status: { $in: ['interested', 'selected'] },
        });
        if (!response) throw new AppError(404, 'Service request response not found.');

        const providerUser = await User.findById(response.providerUser).select('_id');
        if (!providerUser) throw new AppError(404, 'Provider user not found.');

        if (response.status === 'selected') {
            const conversation = await findOrCreateConversation(req.user._id, providerUser._id);
            return res.status(200).json({
                success: true,
                data: {
                    request,
                    response,
                    conversation,
                },
            });
        }

        response.status = 'selected';
        response.selectedAt = new Date();
        await response.save();

        if (!request.selectedResponse) {
            request.selectedResponse = response._id;
            request.selectedProvider = response.providerUser;
            request.selectedAt = new Date();
        }
        if (request.status === 'open') {
            request.status = 'in_conversation';
        }
        await request.save();

        const conversation = await findOrCreateConversation(req.user._id, providerUser._id);

        await writeAuditLog({
            req,
            actorRole: 'athlete',
            targetUserId: providerUser._id,
            targetRole: response.providerType,
            action: AUDIT_ACTIONS.SERVICE_RESPONSE_SELECTED,
            entityType: 'service_response',
            entityId: response._id,
            description: 'Athlete selected a service provider response',
            metadata: {
                serviceRequestId: request._id,
                providerType: response.providerType,
                conversationId: conversation._id,
            },
        });
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
