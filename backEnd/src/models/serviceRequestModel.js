import mongoose from 'mongoose';
import { PERFORMANCE_BRANCHES } from './performanceMemberModel.js';

const serviceRequestAnswerSchema = new mongoose.Schema(
    {
        key: { type: String, required: true },
        question: { type: String, required: true },
        answer: { type: mongoose.Schema.Types.Mixed, default: null },
    },
    { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
    {
        requester: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            required: true,
        },
        targetType: {
            type: String,
            enum: ['coach', 'performance'],
            required: true,
        },
        performanceBranch: {
            type: String,
            enum: PERFORMANCE_BRANCHES,
            required: function () {
                return this.targetType === 'performance';
            },
        },
        title: {
            type: String,
            trim: true,
            maxlength: 160,
            default: '',
        },
        answers: {
            type: [serviceRequestAnswerSchema],
            validate: {
                validator(value) {
                    return Array.isArray(value) && value.length === 10;
                },
                message: 'Service request must include exactly 10 answers.',
            },
        },
        status: {
            type: String,
            enum: ['open', 'in_conversation', 'closed', 'cancelled'],
            default: 'open',
        },
        selectedResponse: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceRequestResponse',
            default: null,
        },
        selectedProvider: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            default: null,
        },
        selectedAt: {
            type: Date,
            default: null,
        },
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
    },
    { timestamps: true }
);

serviceRequestSchema.index({ requester: 1, createdAt: -1 });
serviceRequestSchema.index({ targetType: 1, performanceBranch: 1, status: 1, createdAt: -1 });

export default mongoose.model('ServiceRequest', serviceRequestSchema);
