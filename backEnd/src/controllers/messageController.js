import mongoose from 'mongoose';
import { AppError } from '../utils/appError.js';
import { mongoObjectId } from '../utils/validation.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import User from '../models/userModel.js';

/** Katılımcıları her zaman aynı (artan) sırada tut: tekil index için kritik. */
export const sortParticipants = (a, b) => {
    const ids = [String(a), String(b)].sort();
    return ids.map((id) => new mongoose.Types.ObjectId(id));
};

/**
 * İki kullanıcı arasında konuşmayı bulur; yoksa oluşturur.
 * Hem REST endpoint'i hem socket katmanı tarafından kullanılır.
 */
export const findOrCreateConversation = async (userIdA, userIdB) => {
    const participants = sortParticipants(userIdA, userIdB);

    const existing = await Conversation.findOne({
        participants: { $all: participants, $size: 2 },
    });
    if (existing) return existing;

    try {
        return await Conversation.create({ participants });
    } catch (err) {
        // Eşzamanlı oluşturma yarışında tekil index ihlali olursa mevcut kaydı döndür.
        if (err?.code === 11000) {
            const fallback = await Conversation.findOne({
                participants: { $all: participants, $size: 2 },
            });
            if (fallback) return fallback;
        }
        throw err;
    }
};

const PUBLIC_USER_FIELDS = 'firstName lastName photo';

const messageVisibilityFilter = (userId) => ({
    hiddenFor: { $ne: userId },
});

export const sanitizeMessageForClient = (message) => {
    if (!message) return null;
    const copy = { ...message };
    if (copy.isDeleted) {
        copy.content = '';
    }
    delete copy.hiddenFor;
    return copy;
};

async function getVisibleLastMessage(conversationId, userId) {
    return Message.findOne({
        conversation: conversationId,
        ...messageVisibilityFilter(userId),
    })
        .sort({ createdAt: -1 })
        .populate('sender', PUBLIC_USER_FIELDS)
        .lean();
}

/**
 * GET /api/v1/messages/conversations
 * Kullanıcının tüm konuşmaları (karşı taraf bilgisi, son mesaj, okunmamış sayısı).
 */
export const getConversations = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const conversations = await Conversation.find({
            participants: user._id,
            hiddenFor: { $ne: user._id },
        })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate('participants', PUBLIC_USER_FIELDS)
            .lean();

        const result = await Promise.all(
            conversations.map(async (conv) => {
                const otherUser =
                    (conv.participants || []).find(
                        (p) => String(p._id) !== String(user._id)
                    ) || null;

                const unreadCount = await Message.countDocuments({
                    conversation: conv._id,
                    sender: { $ne: user._id },
                    readBy: { $ne: user._id },
                    ...messageVisibilityFilter(user._id),
                    isDeleted: false,
                });

                const lastMessage = await getVisibleLastMessage(conv._id, user._id);

                return {
                    _id: conv._id,
                    otherUser,
                    lastMessage: sanitizeMessageForClient(lastMessage),
                    lastMessageAt: lastMessage?.createdAt || conv.lastMessageAt || null,
                    unreadCount,
                    updatedAt: conv.updatedAt,
                    createdAt: conv.createdAt,
                };
            })
        );

        return res.status(200).json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/v1/messages/conversations/:conversationId
 * Belirli bir konuşmanın mesajları (sayfalı, createdAt DESC).
 */
export const getMessages = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const conversationId = mongoObjectId.parse(req.params.conversationId);

        const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);

        const conversation = await Conversation.findById(conversationId).lean();
        if (!conversation) {
            throw new AppError(404, 'Conversation not found');
        }

        const isParticipant = (conversation.participants || []).some(
            (p) => String(p) === String(user._id)
        );
        if (!isParticipant) {
            throw new AppError(403, 'You are not a participant of this conversation');
        }

        const filter = {
            conversation: conversationId,
            ...messageVisibilityFilter(user._id),
        };
        const total = await Message.countDocuments(filter);

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', PUBLIC_USER_FIELDS)
            .lean();

        return res.status(200).json({
            success: true,
            data: messages.map(sanitizeMessageForClient),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/v1/messages/conversations
 * Body: { recipientId } — konuşma yoksa oluştur, varsa mevcut olanı döndür.
 */
export const createConversation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const recipientId = mongoObjectId.parse(req.body?.recipientId);

        if (String(recipientId) === String(user._id)) {
            throw new AppError(400, 'You cannot start a conversation with yourself');
        }

        const recipient = await User.findById(recipientId).select('_id');
        if (!recipient) {
            throw new AppError(404, 'Recipient not found');
        }

        const conversation = await findOrCreateConversation(user._id, recipientId);

        await Conversation.updateOne(
            { _id: conversation._id },
            { $pull: { hiddenFor: user._id } }
        );

        const populated = await Conversation.findById(conversation._id)
            .populate('participants', PUBLIC_USER_FIELDS)
            .lean();

        const otherUser =
            (populated.participants || []).find(
                (p) => String(p._id) !== String(user._id)
            ) || null;

        const lastMessage = await getVisibleLastMessage(conversation._id, user._id);

        return res.status(200).json({
            success: true,
            data: {
                _id: populated._id,
                otherUser,
                lastMessage: sanitizeMessageForClient(lastMessage),
                lastMessageAt: lastMessage?.createdAt || populated.lastMessageAt || null,
                unreadCount: 0,
                createdAt: populated.createdAt,
                updatedAt: populated.updatedAt,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Mesaj silme: scope = 'me' (benden sil) | 'everyone' (herkesten sil).
 */
export const deleteMessageForUser = async (
    userId,
    conversationId,
    messageId,
    scope = 'me'
) => {
    const convId = mongoObjectId.parse(conversationId);
    const msgId = mongoObjectId.parse(messageId);
    const normalizedScope = scope === 'everyone' ? 'everyone' : 'me';

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
        throw new AppError(404, 'Conversation not found');
    }

    const isParticipant = (conversation.participants || []).some(
        (p) => String(p) === String(userId)
    );
    if (!isParticipant) {
        throw new AppError(403, 'You are not a participant of this conversation');
    }

    const message = await Message.findOne({
        _id: msgId,
        conversation: convId,
    });
    if (!message) {
        throw new AppError(404, 'Message not found');
    }

    if (normalizedScope === 'everyone') {
        if (String(message.sender) !== String(userId)) {
            throw new AppError(403, 'You can only delete your own messages for everyone');
        }
        if (message.isDeleted) {
            throw new AppError(400, 'Message is already deleted for everyone');
        }

        message.isDeleted = true;
        await message.save();

        const populated = await Message.findById(message._id)
            .populate('sender', PUBLIC_USER_FIELDS)
            .lean();

        return {
            mode: 'everyone',
            messageId: String(msgId),
            conversationId: String(convId),
            message: sanitizeMessageForClient(populated),
            participantIds: conversation.participants.map((p) => String(p)),
        };
    }

    await Message.updateOne({ _id: msgId }, { $addToSet: { hiddenFor: userId } });

    return {
        mode: 'me',
        messageId: String(msgId),
        conversationId: String(convId),
        participantIds: [String(userId)],
    };
};

/**
 * Sohbeti yalnızca istek yapan kullanıcıdan gizler (WhatsApp tarzı).
 */
export const deleteConversationForUser = async (userId, conversationId) => {
    const convId = mongoObjectId.parse(conversationId);

    const conversation = await Conversation.findById(convId);
    if (!conversation) {
        throw new AppError(404, 'Conversation not found');
    }

    const isParticipant = (conversation.participants || []).some(
        (p) => String(p) === String(userId)
    );
    if (!isParticipant) {
        throw new AppError(403, 'You are not a participant of this conversation');
    }

    await Conversation.updateOne({ _id: convId }, { $addToSet: { hiddenFor: userId } });
    await Message.updateMany({ conversation: convId }, { $addToSet: { hiddenFor: userId } });

    return {
        conversationId: String(convId),
        participantIds: [String(userId)],
    };
};

/**
 * DELETE /api/v1/messages/conversations/:conversationId/messages/:messageId
 */
export const deleteMessage = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const scope = req.body?.scope === 'everyone' ? 'everyone' : 'me';

        const result = await deleteMessageForUser(
            user._id,
            req.params.conversationId,
            req.params.messageId,
            scope
        );

        try {
            const { io } = await import('../socket/socketServer.js');
            result.participantIds.forEach((participantId) => {
                io.to(participantId).emit('message_deleted', {
                    conversationId: result.conversationId,
                    messageId: result.messageId,
                    mode: result.mode,
                    message: result.message || null,
                });
            });
        } catch (emitErr) {
            console.error('message_deleted emit error:', emitErr.message);
        }

        return res.status(200).json({
            success: true,
            data: {
                messageId: result.messageId,
                conversationId: result.conversationId,
                mode: result.mode,
                message: result.message || null,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * DELETE /api/v1/messages/conversations/:conversationId
 * Sohbeti yalnızca istek yapan kullanıcıdan gizler.
 */
export const deleteConversation = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new AppError(401, 'Unauthorized');
        }

        const result = await deleteConversationForUser(
            user._id,
            req.params.conversationId
        );

        try {
            const { io } = await import('../socket/socketServer.js');
            // Yalnızca silen kullanıcıya bildir — karşı taraf etkilenmez.
            io.to(String(user._id)).emit('conversation_deleted', {
                conversationId: result.conversationId,
            });
        } catch (emitErr) {
            console.error('conversation_deleted emit error:', emitErr.message);
        }

        return res.status(200).json({
            success: true,
            data: { conversationId: result.conversationId },
        });
    } catch (err) {
        next(err);
    }
};
