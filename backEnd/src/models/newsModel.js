import mongoose from 'mongoose';

const newsImageSchema = new mongoose.Schema(
    {
        path: { type: String },
        originalName: { type: String },
        mimeType: { type: String },
        size: { type: Number },
    },
    { _id: false }
);

const newsSchema = new mongoose.Schema(
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
        content: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20000,
        },
        coverImage: newsImageSchema,
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

newsSchema.index({ slug: 1 }, { unique: true });
newsSchema.index({ status: 1, isActive: 1, publishedAt: -1 });
newsSchema.index({ status: 1, isActive: 1, sportGroup: 1, publishedAt: -1 });
newsSchema.index({ status: 1, isActive: 1, sport: 1, publishedAt: -1 });
newsSchema.index({ title: 'text', excerpt: 'text', content: 'text' });

export default mongoose.model('News', newsSchema);
