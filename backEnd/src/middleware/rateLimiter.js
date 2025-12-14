import rateLimit from 'express-rate-limit';

export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    skip: (req) => {
        return req.method !== 'POST';
    },
});

export const signupRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: 'Too many signup attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.method !== 'POST';
    },
});

export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: 'Too many requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
        return req.path.startsWith('/uploads') ||
            req.method === 'GET' ||
            req.path.startsWith('/api/v1/auth/refresh') ||
            req.path.startsWith('/api/v1/admin') ||
            req.path.startsWith('/api/v1/reference-data');
    },
    skipSuccessfulRequests: false,
});

