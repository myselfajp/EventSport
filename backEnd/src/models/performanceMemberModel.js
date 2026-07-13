import mongoose from 'mongoose';

export const PERFORMANCE_BRANCHES = [
    'manager',
    'psychologist',
    'dietitian',
    'psychotherapist',
];

const performanceMemberSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
        },
        branch: {
            type: String,
            enum: PERFORMANCE_BRANCHES,
            required: [true, 'Performance branch is required'],
        },
        title: {
            type: String,
            trim: true,
            default: '',
        },
        about: {
            type: String,
            trim: true,
            default: '',
            maxlength: 2000,
        },
        certificate: {
            path: { type: String, required: true },
            originalName: { type: String, required: true },
            mimeType: { type: String, required: true },
            size: { type: Number, required: true },
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
        isVerified: {
            type: Boolean,
            default: false,
        },
        rejectionReason: {
            type: String,
            trim: true,
            default: '',
        },
    },
    { timestamps: true }
);

performanceMemberSchema.index({ branch: 1, status: 1, isVerified: 1 });

export default mongoose.model('PerformanceMember', performanceMemberSchema);
