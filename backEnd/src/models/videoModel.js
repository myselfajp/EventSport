import mongoose from 'mongoose';

const videoFileSchema = new mongoose.Schema(
    {
        path: { type: String },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
    },
    { _id: false }
);

const videoSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            maxlength: 180,
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 220,
            unique: true,
        },
        excerpt: {
            type: String,
            required: true,
            trim: true,
            maxlength: 320,
        },
        description: {
            type: String,
            required: true,
            trim: true,
            maxlength: 5000,
        },
        videoType: {
            type: String,
            enum: ['educational', 'normal'],
            required: true,
            index: true,
        },
        thumbnail: videoFileSchema,
        videoFile: videoFileSchema,
        externalUrl: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
        sportGroup: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'SportGroup',
            default: null,
            index: true,
        },
        sport: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Sport',
            default: null,
            index: true,
        },
        authorUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        authorCoach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
            index: true,
        },
        authorType: {
            type: String,
            enum: ['admin', 'coach'],
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['draft', 'published'],
            default: 'published',
            index: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        publishedAt: {
            type: Date,
            default: () => new Date(),
            index: true,
        },
    },
    { timestamps: true }
);

videoSchema.index({ slug: 1 }, { unique: true });
videoSchema.index({ status: 1, isActive: 1, publishedAt: -1 });
videoSchema.index({ status: 1, isActive: 1, videoType: 1, publishedAt: -1 });
videoSchema.index({ status: 1, isActive: 1, sportGroup: 1, publishedAt: -1 });
videoSchema.index({ status: 1, isActive: 1, sport: 1, publishedAt: -1 });
videoSchema.index({ title: 'text', excerpt: 'text', description: 'text' });

export default mongoose.model('Video', videoSchema);
