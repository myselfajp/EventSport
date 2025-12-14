import User from '../models/userModel.js';
import { AppError } from '../utils/appError.js';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000;

export const checkAccountLockout = async (email) => {
    const user = await User.findOne({ email });

    if (!user) {
        return { locked: false, user: null };
    }

    if (user.accountLockedUntil && user.accountLockedUntil > new Date()) {
        const remainingMinutes = Math.ceil(
            (user.accountLockedUntil - new Date()) / (60 * 1000)
        );
        throw new AppError(
            423,
            `Account is locked. Please try again in ${remainingMinutes} minute(s).`
        );
    }

    if (user.accountLockedUntil && user.accountLockedUntil <= new Date()) {
        user.accountLockedUntil = null;
        user.failedLoginAttempts = 0;
        await user.save();
    }

    return { locked: false, user };
};

export const handleFailedLogin = async (user) => {
    if (!user) return;

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.accountLockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
    }

    await user.save();
};

export const handleSuccessfulLogin = async (user, ipAddress) => {
    if (!user) return;

    user.failedLoginAttempts = 0;
    user.accountLockedUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = ipAddress;
    await user.save();
};

