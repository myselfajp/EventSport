import mongoose from 'mongoose';

const socialLinkSchema = new mongoose.Schema(
    {
        platform: {
            type: String,
            enum: ['instagram', 'twitter', 'linkedin', 'youtube', 'telegram', 'facebook'],
            required: true,
        },
        url: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
    },
    { _id: false }
);

const welcomePageSettingsSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            default: 'default',
            unique: true,
            immutable: true,
        },
        headline: {
            type: String,
            default: 'Your next sporting adventure starts here.',
            trim: true,
            maxlength: 300,
        },
        subheadline: {
            type: String,
            default:
                'Discover events, connect with coaches, and join athletes near you — all in one place.',
            trim: true,
            maxlength: 800,
        },
        emailPrompt: {
            type: String,
            default: 'Get updates about events and features in your area.',
            trim: true,
            maxlength: 300,
        },
        ctaSubmitLabel: {
            type: String,
            default: 'Get started',
            trim: true,
            maxlength: 80,
        },
        ctaSkipLabel: {
            type: String,
            default: 'Explore EventSport',
            trim: true,
            maxlength: 80,
        },
        image: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        imageAlt: {
            type: String,
            default: 'EventSport welcome',
            trim: true,
            maxlength: 200,
        },
        socialLinks: {
            type: [socialLinkSchema],
            default: [],
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('WelcomePageSettings', welcomePageSettingsSchema);
