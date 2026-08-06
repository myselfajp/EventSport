import mongoose from 'mongoose';

const welcomePageLeadSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
            maxlength: 254,
            index: true,
        },
        visitorKey: {
            type: String,
            default: null,
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
            index: true,
        },
        kvkkConsent: {
            type: Boolean,
            required: true,
        },
        marketingConsent: {
            type: Boolean,
            default: false,
        },
        ipAddress: { type: String },
        userAgent: { type: String },
    },
    { timestamps: true }
);

welcomePageLeadSchema.index({ createdAt: -1 });
welcomePageLeadSchema.index({ email: 1, createdAt: -1 });

export default mongoose.model('WelcomePageLead', welcomePageLeadSchema);
