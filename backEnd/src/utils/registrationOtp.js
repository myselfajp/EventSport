import crypto from 'crypto';
import RegistrationOtp from '../models/registrationOtpModel.js';
import { AppError } from './appError.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;

export function generateOtpCode() {
    return String(crypto.randomInt(100000, 1000000));
}

export function hashOtp(code) {
    return crypto.createHash('sha256').update(code).digest('hex');
}

export async function saveRegistrationOtp(email, code) {
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    await RegistrationOtp.findOneAndUpdate(
        { email },
        {
            email,
            otpHash: hashOtp(code),
            expiresAt,
            attempts: 0,
        },
        { upsert: true, new: true }
    );
}

export async function assertCanResendOtp(email) {
    const existing = await RegistrationOtp.findOne({ email });
    if (!existing?.updatedAt) return;
    const elapsed = Date.now() - new Date(existing.updatedAt).getTime();
    if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new AppError(429, `Yeni kod için ${waitSec} saniye bekleyin.`);
    }
}

export async function verifyAndConsumeRegistrationOtp(email, code) {
    const doc = await RegistrationOtp.findOne({ email }).select('+otpHash');
    if (!doc) {
        throw new AppError(400, 'Önce e-postanıza doğrulama kodu gönderin.');
    }
    if (doc.expiresAt < new Date()) {
        await RegistrationOtp.deleteOne({ email });
        throw new AppError(400, 'Doğrulama kodunun süresi doldu. Yeni kod isteyin.');
    }
    if (doc.attempts >= MAX_ATTEMPTS) {
        await RegistrationOtp.deleteOne({ email });
        throw new AppError(400, 'Çok fazla hatalı deneme. Yeni kod isteyin.');
    }
    if (hashOtp(code) !== doc.otpHash) {
        doc.attempts += 1;
        await doc.save();
        throw new AppError(400, 'Doğrulama kodu hatalı.');
    }
    await RegistrationOtp.deleteOne({ email });
}
