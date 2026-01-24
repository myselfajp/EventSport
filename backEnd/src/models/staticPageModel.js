import mongoose from 'mongoose';

const staticPageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Page name is required'],
            unique: true,
        },
        title: {
            type: String,
            required: [true, 'Page title is required'],
        },
        content: {
            type: String,
            required: [true, 'Page content is required'],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

export default mongoose.model('StaticPage', staticPageSchema);
