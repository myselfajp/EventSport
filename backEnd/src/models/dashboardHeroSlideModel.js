import mongoose from 'mongoose';

const dashboardHeroSlideSchema = new mongoose.Schema(
    {
        badgeLabel: {
            type: String,
            default: '',
            trim: true,
            maxlength: 80,
        },
        /** Use {{firstName}} for personalized greeting; optional if image-only slide */
        title: {
            type: String,
            default: '',
            trim: true,
            maxlength: 220,
        },
        subtitle: {
            type: String,
            default: '',
            trim: true,
            maxlength: 600,
        },
        image: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        imageAlt: {
            type: String,
            default: '',
            trim: true,
            maxlength: 200,
        },
        ctaLabel: {
            type: String,
            trim: true,
            maxlength: 80,
            default: '',
        },
        ctaHref: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
        ctaRequiresAdminRole: {
            type: Boolean,
            default: false,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        order: {
            type: Number,
            default: 0,
        },
        /** Incremented when users follow the tracked click URL */
        clickCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastClickedAt: {
            type: Date,
        },
        /** home | blog | news | videos — which public page shows this slide */
        context: {
            type: String,
            enum: ['home', 'blog', 'news', 'videos'],
            default: 'home',
            index: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('DashboardHeroSlide', dashboardHeroSlideSchema);
