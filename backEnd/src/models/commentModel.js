import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema(
    {
        fromUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        toUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        toCompany: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company',
        },
        toFacility: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Facility',
        },
        toCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
        },
        content: {
            type: String,
            required: true,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export default mongoose.model('Comment', commentSchema);
