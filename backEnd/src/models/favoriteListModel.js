import mongoose from 'mongoose';

const favoriteListSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        event: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Event',
            default: null,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        facility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('FavoriteList', favoriteListSchema);
