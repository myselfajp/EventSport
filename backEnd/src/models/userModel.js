import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
        },
        photo: {
            path: { type: String },
            originalName: { type: String },
            mimeType: { type: String },
            size: { type: Number },
        },
        age: {
            type: Date,
            required: [true, 'Age is required'],
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
        isPhoneVerified: {
            type: Boolean,
            default: false,
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: 7,
            select: false,
        },
        participant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Participant',
            default: null,
        },
        coach: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Coach',
            default: null,
        },
        facility: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Facility',
                default: null,
            },
        ],
        company: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Company',
                default: null,
            },
        ],
        role: {
            type: Number,
            default: 1,
        },
        refreshTokens: [
            {
                token: {
                    type: String,
                    required: true,
                },
                createdAt: {
                    type: Date,
                    default: Date.now,
                },
                deviceInfo: {
                    type: String,
                },
                ipAddress: {
                    type: String,
                },
            },
        ],
        failedLoginAttempts: {
            type: Number,
            default: 0,
        },
        accountLockedUntil: {
            type: Date,
            default: null,
        },
        lastLoginAt: {
            type: Date,
        },
        lastLoginIp: {
            type: String,
        },
        activityLog: [
            {
                action: {
                    type: String,
                    required: true,
                },
                ipAddress: {
                    type: String,
                },
                userAgent: {
                    type: String,
                },
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                success: {
                    type: Boolean,
                    default: true,
                },
            },
        ],
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
