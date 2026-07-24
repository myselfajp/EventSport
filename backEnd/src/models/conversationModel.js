import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
    {
        // Always exactly 2 participants (1-1 DM).
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
        /** Per-user conversation hide — hidden from list until a new message arrives. */
        hiddenFor: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
    },
    { timestamps: true }
);

// Fast lookup by participant (user's conversations).
conversationSchema.index({ participants: 1 });
// Sort conversation list by newest message.
conversationSchema.index({ lastMessageAt: -1 });

/**
 * Only one Conversation may exist between two users.
 * Participants are always stored in ascending ObjectId order so
 * (A,B) and (B,A) map to the same sorted array and this compound unique
 * index prevents a second record.
 */
conversationSchema.index(
    { 'participants.0': 1, 'participants.1': 1 },
    { unique: true }
);

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
