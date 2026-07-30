import mongoose from 'mongoose';

const passwordResetOtpSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        otpHash: {
            type: String,
            required: true,
            select: false,
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        attempts: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: true }
);

passwordResetOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PasswordResetOtp', passwordResetOtpSchema);
