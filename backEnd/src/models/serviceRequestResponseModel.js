import mongoose from 'mongoose';

const serviceRequestResponseSchema = new mongoose.Schema(
    {
        serviceRequest: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceRequest',
            required: true,
        },
        providerUser: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        providerType: {
            type: String,
            enum: ['coach', 'performance'],
            required: true,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        performanceMember: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'PerformanceMember',
            default: null,
        },
        message: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: '',
        },
        status: {
            type: String,
            enum: ['interested', 'selected', 'withdrawn', 'rejected'],
            default: 'interested',
        },
        selectedAt: {
            type: Date,
            default: null,
        },
    },
    { timestamps: true }
);

serviceRequestResponseSchema.index(
    { serviceRequest: 1, providerUser: 1 },
    { unique: true }
);
serviceRequestResponseSchema.index({ providerUser: 1, createdAt: -1 });

export default mongoose.model('ServiceRequestResponse', serviceRequestResponseSchema);
