import mongoose from 'mongoose';

export const HEADER_LOGO_KEY = 'site-header';

const dashboardHeaderLogoSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            default: HEADER_LOGO_KEY,
        },
        image: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        imageAlt: {
            type: String,
            default: 'EventSport',
            trim: true,
            maxlength: 120,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

export default mongoose.model('DashboardHeaderLogo', dashboardHeaderLogoSchema);
