import mongoose from 'mongoose';

const dashboardHeroClickSchema = new mongoose.Schema(
    {
        slideId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'DashboardHeroSlide',
            required: true,
            index: true,
        },
        clickedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
    },
    { timestamps: false }
);

dashboardHeroClickSchema.index({ slideId: 1, clickedAt: -1 });

export default mongoose.model('DashboardHeroClick', dashboardHeroClickSchema);
