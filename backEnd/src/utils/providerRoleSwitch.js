import { unlink } from 'fs/promises';
import User from '../models/userModel.js';
import Coach from '../models/coachModel.js';
import Branch from '../models/branchModel.js';
import PerformanceMember from '../models/performanceMemberModel.js';
import ServiceRequest from '../models/serviceRequestModel.js';
import ServiceRequestResponse from '../models/serviceRequestResponseModel.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import { sortParticipants } from '../controllers/messageController.js';

async function deleteBranchCertificateFile(branch) {
    if (!branch?.certificate?.path) return;
    try {
        await unlink(branch.certificate.path);
    } catch (err) {
        console.warn(`Failed to delete certificate file: ${branch.certificate.path}`, err);
    }
}

async function deleteConversationBetween(userIdA, userIdB) {
    const participants = sortParticipants(userIdA, userIdB);
    const conversation = await Conversation.findOne({
        participants: { $all: participants, $size: 2 },
    });
    if (!conversation) return false;

    await Message.deleteMany({ conversation: conversation._id });
    await Conversation.findByIdAndDelete(conversation._id);
    return true;
}

export async function cleanupProviderServiceRequestData(userId) {
    const selectedRequests = await ServiceRequest.find({ selectedProvider: userId })
        .select('requester')
        .lean();

    const peerUserIds = new Set(
        selectedRequests.map((request) => String(request.requester)).filter(Boolean)
    );

    await ServiceRequest.updateMany(
        { selectedProvider: userId },
        {
            $set: {
                status: 'open',
                selectedResponse: null,
                selectedProvider: null,
                selectedAt: null,
            },
        }
    );

    const deleteResponses = await ServiceRequestResponse.deleteMany({ providerUser: userId });

    let conversationsRemoved = 0;
    for (const peerId of peerUserIds) {
        const removed = await deleteConversationBetween(userId, peerId);
        if (removed) conversationsRemoved += 1;
    }

    return {
        responsesRemoved: deleteResponses.deletedCount || 0,
        conversationsRemoved,
        affectedRequests: selectedRequests.length,
    };
}

export async function removeCoachProfileForUser(userId) {
    await cleanupProviderServiceRequestData(userId);

    const user = await User.findById(userId).select('coach').lean();
    if (!user?.coach) return { removed: false };

    const coachId = user.coach;
    const branches = await Branch.find({ coach: coachId });
    for (const branch of branches) {
        await deleteBranchCertificateFile(branch);
    }
    await Branch.deleteMany({ coach: coachId });
    await User.updateMany({ coach: coachId }, { $set: { coach: null } });
    await Coach.findByIdAndDelete(coachId);

    return { removed: true };
}

export async function removePerformanceProfileForUser(userId) {
    await cleanupProviderServiceRequestData(userId);

    const user = await User.findById(userId).select('performanceMember').lean();
    if (!user?.performanceMember) return { removed: false };

    const profile = await PerformanceMember.findById(user.performanceMember);
    if (profile?.certificate?.path) {
        try {
            await unlink(profile.certificate.path);
        } catch (err) {
            console.warn('Failed to delete performance certificate:', err);
        }
    }

    await PerformanceMember.findByIdAndDelete(user.performanceMember);
    await User.findByIdAndUpdate(userId, { $set: { performanceMember: null } });

    return { removed: true };
}
