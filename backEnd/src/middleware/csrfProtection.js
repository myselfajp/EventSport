import crypto from 'crypto';

const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_COOKIE = 'csrf-token';

export const generateCSRFToken = (req, res, next) => {
    if (req.method === 'GET' && !req.cookies[CSRF_TOKEN_COOKIE]) {
        const token = crypto.randomBytes(32).toString('hex');
        const cookieOptions = {
            httpOnly: false,
            secure: false,
            sameSite: 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        };

        const cookieDomain = process.env.COOKIE_DOMAIN;
        if (cookieDomain && !cookieDomain.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            cookieOptions.domain = cookieDomain;
        }

        res.cookie(CSRF_TOKEN_COOKIE, token, cookieOptions);
    }
    next();
};

export const validateCSRFToken = (req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
        return next();
    }

    const cookieToken = req.cookies[CSRF_TOKEN_COOKIE];
    const headerToken = req.headers[CSRF_TOKEN_HEADER];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token',
        });
    }

    next();
};

