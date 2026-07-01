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

        const conversations = await Conversation.find({ participants: user._id })
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .populate('participants', PUBLIC_USER_FIELDS)
            .populate('lastMessage')
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
                    isDeleted: false,
                });

                return {
                    _id: conv._id,
                    otherUser,
                    lastMessage: conv.lastMessage || null,
                    lastMessageAt: conv.lastMessageAt || null,
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

        const filter = { conversation: conversationId, isDeleted: false };
        const total = await Message.countDocuments(filter);

        const messages = await Message.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .populate('sender', PUBLIC_USER_FIELDS)
            .lean();

        return res.status(200).json({
            success: true,
            data: messages,
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

        const populated = await Conversation.findById(conversation._id)
            .populate('participants', PUBLIC_USER_FIELDS)
            .populate('lastMessage')
            .lean();

        const otherUser =
            (populated.participants || []).find(
                (p) => String(p._id) !== String(user._id)
            ) || null;

        return res.status(200).json({
            success: true,
            data: {
                _id: populated._id,
                otherUser,
                lastMessage: populated.lastMessage || null,
                lastMessageAt: populated.lastMessageAt || null,
                unreadCount: 0,
                createdAt: populated.createdAt,
                updatedAt: populated.updatedAt,
            },
        });
    } catch (err) {
        next(err);
    }
};
