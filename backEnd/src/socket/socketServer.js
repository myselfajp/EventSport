import http from 'http';
import { Server } from 'socket.io';
import app from '../app.js';
import { verifyAccessToken } from '../utils/jwtHelper.js';
import User from '../models/userModel.js';
import Conversation from '../models/conversationModel.js';
import Message from '../models/messageModel.js';
import { createNotification } from '../utils/notificationHelper.js';

// Express app'ten ayrı bir HTTP server: socket.io bu server'a bağlanır.
const httpServer = http.createServer(app);

const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : [
          'http://127.0.0.1:3000',
          'http://localhost:3000',
          'http://127.0.0.1:3001',
          'http://localhost:3001',
      ];

const isDevelopment = process.env.NODE_ENV !== 'production';

const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
        origin: (origin, callback) => {
            if (!origin) return callback(null, true);
            if (allowedOrigins.includes(origin)) return callback(null, true);
            if (isDevelopment) return callback(null, true);
            return callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
        methods: ['GET', 'POST'],
    },
});

const PUBLIC_USER_FIELDS = 'firstName lastName photo';

// --- JWT handshake authentication ---
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token;
        if (!token) {
            return next(new Error('Authentication error: token missing'));
        }

        const decoded = verifyAccessToken(token);
        const user = await User.findById(decoded.userId).select('_id isActive');

        if (!user || user.isActive === false) {
            return next(new Error('Authentication error: invalid user'));
        }

        socket.userId = String(user._id);
        return next();
    } catch (err) {
        return next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    // Her kullanıcı kendi userId'siyle bir room'a katılır.
    socket.join(socket.userId);
    console.log(`🔌 Socket connected: user=${socket.userId} (${socket.id})`);

    /**
     * send_message: { conversationId, content }
     * Mesajı DB'ye kaydeder, Conversation.lastMessage günceller ve karşı tarafın
     * (ve gönderenin diğer cihazlarının) room'una "new_message" emit eder.
     */
    socket.on('send_message', async (payload = {}, ack) => {
        try {
            const { conversationId, content } = payload;

            if (!conversationId || typeof content !== 'string' || !content.trim()) {
                if (typeof ack === 'function') {
                    ack({ success: false, error: 'conversationId and content are required' });
                }
                return;
            }

            const trimmed = content.trim().slice(0, 2000);

            const conversation = await Conversation.findById(conversationId);
            if (!conversation) {
                if (typeof ack === 'function') {
                    ack({ success: false, error: 'Conversation not found' });
                }
                return;
            }

            const isParticipant = conversation.participants.some(
                (p) => String(p) === socket.userId
            );
            if (!isParticipant) {
                if (typeof ack === 'function') {
                    ack({ success: false, error: 'Not a participant of this conversation' });
                }
                return;
            }

            let message = await Message.create({
                conversation: conversation._id,
                sender: socket.userId,
                content: trimmed,
                readBy: [socket.userId],
            });

            conversation.lastMessage = message._id;
            conversation.lastMessageAt = message.createdAt;
            await conversation.save();

            message = await message.populate('sender', PUBLIC_USER_FIELDS);
            const payloadOut = message.toObject();

            // Relay the message to every participant's room (sender included).
            conversation.participants.forEach((participantId) => {
                io.to(String(participantId)).emit('new_message', payloadOut);
            });

            // Persist a notification for the recipient(s) and push it live.
            const senderName =
                `${payloadOut.sender?.firstName || ''} ${
                    payloadOut.sender?.lastName || ''
                }`.trim() || 'Someone';

            const recipients = conversation.participants.filter(
                (participantId) => String(participantId) !== socket.userId
            );

            await Promise.all(
                recipients.map(async (recipientId) => {
                    try {
                        const notification = await createNotification({
                            scope: 'user',
                            type: 'message_received',
                            userId: recipientId,
                            title: 'New message',
                            message: `${senderName} sent you a message`,
                            icon: 'user',
                            actionUrl: `/messaging?conversationId=${conversation._id}`,
                            data: {
                                conversationId: String(conversation._id),
                                messageId: String(payloadOut._id),
                                senderId: socket.userId,
                            },
                        });

                        io.to(String(recipientId)).emit(
                            'new_notification',
                            notification.toObject ? notification.toObject() : notification
                        );
                    } catch (notifyErr) {
                        console.error(
                            'socket message notification error:',
                            notifyErr.message
                        );
                    }
                })
            );

            if (typeof ack === 'function') {
                ack({ success: true, data: payloadOut });
            }
        } catch (err) {
            console.error('socket send_message error:', err.message);
            if (typeof ack === 'function') {
                ack({ success: false, error: 'Failed to send message' });
            }
        }
    });

    /**
     * mark_read: { conversationId }
     * İlgili konuşmadaki, kullanıcının göndermediği mesajların readBy alanına userId ekler.
     */
    socket.on('mark_read', async (payload = {}) => {
        try {
            const { conversationId } = payload;
            if (!conversationId) return;

            const conversation = await Conversation.findById(conversationId).select(
                'participants'
            );
            if (!conversation) return;

            const isParticipant = conversation.participants.some(
                (p) => String(p) === socket.userId
            );
            if (!isParticipant) return;

            await Message.updateMany(
                {
                    conversation: conversationId,
                    sender: { $ne: socket.userId },
                    readBy: { $ne: socket.userId },
                },
                { $addToSet: { readBy: socket.userId } }
            );

            // Karşı tarafa okundu bilgisini ilet.
            conversation.participants.forEach((participantId) => {
                io.to(String(participantId)).emit('messages_read', {
                    conversationId: String(conversationId),
                    readBy: socket.userId,
                });
            });
        } catch (err) {
            console.error('socket mark_read error:', err.message);
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(
            `🔌 Socket disconnected: user=${socket.userId} (${socket.id}) reason=${reason}`
        );
    });
});

export { httpServer, io };
export default httpServer;
