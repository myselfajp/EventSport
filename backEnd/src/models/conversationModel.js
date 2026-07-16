import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        // Her zaman tam olarak 2 katılımcı (1-1 DM).
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true,
            },
        ],
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null,
        },
        lastMessageAt: {
            type: Date,
            default: null,
        },
        /** Kullanıcı bazlı sohbet gizleme — listede görünmez, yeni mesaj gelince açılır. */
        hiddenFor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
);

// Katılımcı dizisi üzerinde hızlı sorgulama (kullanıcının konuşmaları).
conversationSchema.index({ participants: 1 });
// Konuşma listesini en yeni mesaja göre sıralama.
conversationSchema.index({ lastMessageAt: -1 });

/**
 * İki kullanıcı arasında yalnızca tek bir Conversation olabilir.
 * Katılımcılar her zaman artan ObjectId sırasıyla saklanır; böylece
 * (A,B) ve (B,A) aynı sıralanmış diziye eşlenir ve bu compound unique
 * index ikinci bir kaydın oluşmasını engeller.
 */
conversationSchema.index(
    { 'participants.0': 1, 'participants.1': 1 },
    { unique: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
