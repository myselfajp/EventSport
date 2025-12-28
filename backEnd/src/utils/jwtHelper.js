import jwt from 'jsonwebtoken';
import { AppError } from './appError.js';

const ACCESS_TOKEN_EXPIRY = '30d';

export const generateTokens = async (userId) => {
    const payload = { userId };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    return { userId, accessToken };
};

export const verifyAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            throw new AppError(401, 'Access token expired');
        }
        throw new AppError(401, 'Invalid access token');
    }
};

export function sendTokens(res, tokens) {
    res.set('Authorization', `Bearer ${tokens.accessToken}`);
}
