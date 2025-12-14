import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';
import { AppError } from './appError.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const MAX_REFRESH_TOKENS = 5;

export const generateTokens = async (userId, ipAddress = null, userAgent = null) => {
    const payload = { userId };

    const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
    });

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError(404, 'User not found');
    }

    const tokenData = {
        token: refreshToken,
        createdAt: new Date(),
        deviceInfo: userAgent,
        ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
    };

    let refreshTokens = user.refreshTokens || [];
    
    if (refreshTokens.length >= MAX_REFRESH_TOKENS) {
        refreshTokens = refreshTokens.slice(-(MAX_REFRESH_TOKENS - 1));
    }

    refreshTokens.push(tokenData);

    await User.findByIdAndUpdate(userId, { refreshTokens });

    return { userId, accessToken, refreshToken };
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

export const verifyRefreshToken = async (userId, token) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
            throw new AppError(401, 'Refresh token invalid');
        }

        const tokenEntry = user.refreshTokens.find((t) => t.token === token);
        if (!tokenEntry) {
            throw new AppError(401, 'Refresh token invalid');
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        return { decoded, tokenEntry };
    } catch (err) {
        if (err instanceof AppError) throw err;

        if (err.name === 'TokenExpiredError') {
            throw new AppError(401, 'Refresh token expired');
        }
        throw new AppError(401, 'Refresh token invalid');
    }
};

export const refreshAccessToken = async (accessToken, refreshToken, req = null) => {
    try {
        const { userId } = jwt.verify(accessToken, process.env.JWT_SECRET, {
            ignoreExpiration: true,
        });
        try {
            const { decoded } = await verifyRefreshToken(userId, refreshToken);

            const payload = { userId };
            const newAccessToken = jwt.sign(payload, process.env.JWT_SECRET, {
                expiresIn: ACCESS_TOKEN_EXPIRY,
            });

            const ipAddress = req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
            const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : null;

            const user = await User.findById(userId);
            if (user && user.refreshTokens) {
                const tokenIndex = user.refreshTokens.findIndex((t) => t.token === refreshToken);
                if (tokenIndex !== -1) {
                    user.refreshTokens[tokenIndex].lastUsedAt = new Date();
                    if (ipAddress) {
                        user.refreshTokens[tokenIndex].ipAddress = Array.isArray(ipAddress) ? ipAddress[0] : ipAddress;
                    }
                    await user.save();
                }
            }

            return { userId, accessToken: newAccessToken, refreshToken, tokensPair: 'access_only' };
        } catch (refreshTokenErr) {
            if (refreshTokenErr.message === 'Refresh token expired') {
                await revokeRefreshToken(userId, refreshToken);
                const ipAddress = req ? (req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress) : null;
                const userAgent = req ? (req.headers['user-agent'] || 'Unknown') : null;
                return { ...(await generateTokens(userId, ipAddress, userAgent)), tokensPair: 'both' };
            }
            throw refreshTokenErr;
        }
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(401, 'Token refresh failed');
    }
};

export const revokeRefreshToken = async (userId, refreshToken) => {
    try {
        const user = await User.findById(userId);
        if (!user || !user.refreshTokens || user.refreshTokens.length === 0) {
            return true;
        }

        const tokenExists = user.refreshTokens.some((t) => t.token === refreshToken);
        if (!tokenExists) {
            return true;
        }

        user.refreshTokens = user.refreshTokens.filter((t) => t.token !== refreshToken);
        await user.save();
        return true;
    } catch (err) {
        if (err instanceof AppError) throw err;
        throw new AppError(500, 'Failed to revoke refresh token');
    }
};

export function sendTokens(res, tokens, { setAccessHeader = true } = {}) {
    const cookieOptions = {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
    };

    const cookieDomain = process.env.COOKIE_DOMAIN;
    if (cookieDomain && !cookieDomain.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        cookieOptions.domain = cookieDomain;
    }

    res.cookie('refresh_token', tokens.refreshToken, cookieOptions);

    if (setAccessHeader) {
        res.set('Authorization', `Bearer ${tokens.accessToken}`);
    }
}
