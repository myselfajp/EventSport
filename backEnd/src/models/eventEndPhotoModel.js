import mongoose from 'mongoose';

const eventEndPhotoSchema = new mongoose.Schema(
    {
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            required: true,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        photo: {
            path: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
        },
        isApproved: {
            type: String,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('EventEndPhoto', eventEndPhotoSchema);
