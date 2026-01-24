import mongoose from 'mongoose';

const termsAcceptedSchema = new mongoose.Schema(
    {
        versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalDocument', required: true },
        acceptedAt: { type: Date, required: true, default: () => new Date() },
    },
    { _id: false }
);

const kvkkConsentSchema = new mongoose.Schema(
    {
        agreed: { type: Boolean, required: true },
        versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'LegalDocument', required: true },
        consentedAt: { type: Date, required: true, default: () => new Date() },
    },
    { _id: false }
);

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
        termsAccepted: {
            type: termsAcceptedSchema,
            default: null,
        },
        kvkkConsent: {
            type: kvkkConsentSchema,
            default: null,
        },
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
