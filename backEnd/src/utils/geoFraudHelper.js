import geoip from 'geoip-lite';
import { AppError } from './appError.js';

export function normalizeCountry(value) {
    if (!value) return '';
    const clean = String(value).trim().toUpperCase();
    if (clean === 'TR' || clean === 'TURKEY' || clean === 'TÜRKIYE' || clean === 'TURKIYE') {
        return 'TR';
    }
    if (clean === 'US' || clean === 'USA' || clean === 'UNITED STATES') {
        return 'US';
    }
    const match = clean.match(/^[A-Z]{2}$/);
    return match ? match[0] : '';
}

export function parseCountryFromLocation(locationInput) {
    if (!locationInput) return '';
    if (typeof locationInput === 'object') {
        return normalizeCountry(locationInput.country || locationInput.countryCode || locationInput.countryName);
    }
    const parts = String(locationInput).split(/[/,]/).map((p) => p.trim()).filter(Boolean);
    // Check parts in reverse order first (as "District, City, Country" is common), then forwards
    for (let i = parts.length - 1; i >= 0; i--) {
        const candidate = normalizeCountry(parts[i]);
        if (candidate) return candidate;
    }
    return '';
}

export function countryDisplayName(code) {
    const norm = normalizeCountry(code);
    if (norm === 'TR') return 'Turkey';
    if (norm === 'US') return 'United States';
    return norm || 'Unknown';
}

export function clientIp(req) {
    const cf = req.headers?.['cf-connecting-ip'];
    if (cf && typeof cf === 'string') return cf.trim();

    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        const first = forwarded.split(',')[0].trim();
        if (first) return first.replace(/^::ffff:/, '');
    }

    const realIp = req.headers?.['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
        return realIp.trim().replace(/^::ffff:/, '');
    }

    const raw = req.ip || req.socket?.remoteAddress || '';
    return String(raw).replace(/^::ffff:/, '').trim();
}

export function isPublicIp(ip) {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return false;
    // Private IPv4 ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16
    if (/^(10|127)\./.test(ip)) return false;
    if (/^192\.168\./.test(ip)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
    if (/^169\.254\./.test(ip)) return false;
    // Private IPv6 ranges (fc00::/7, fe80::/10)
    if (/^f[cd]/i.test(ip)) return false;
    if (/^fe[89ab]/i.test(ip)) return false;
    return true;
}

export function getCountryFromHeaders(req) {
    const headers = [
        'cf-ipcountry',
        'x-vercel-ip-country',
        'x-country-code',
        'cloudfront-viewer-country',
        'x-appengine-country',
    ];
    for (const h of headers) {
        const val = req.headers?.[h];
        if (val) {
            const norm = normalizeCountry(val);
            if (norm && norm !== 'XX') return norm;
        }
    }
    return '';
}

export function getCountryFromIp(ip, req) {
    const headerCountry = req ? getCountryFromHeaders(req) : '';
    if (headerCountry) return headerCountry;

    if (!isPublicIp(ip)) return null;

    try {
        const geo = geoip.lookup(ip);
        if (geo?.country) {
            return normalizeCountry(geo.country);
        }
    } catch (err) {
        console.warn('GeoIP lookup warning:', err.message);
    }
    return null;
}

/**
 * Validates that an event or service request creation matches:
 * 1) The user's registered country.
 * 2) The physical connection location of the user (IP geolocation).
 *
 * @param {Object} options
 * @param {Object} options.req Express request
 * @param {Object} options.user Authenticated user
 * @param {string} [options.targetCountry] Country where the event/request is placed (optional if online)
 * @param {string} [options.actionLabel] 'event' | 'service request'
 */
export function assertCreationAllowedByLocation({
    req,
    user,
    targetCountry = '',
    actionLabel = 'event',
}) {
    if (!user) throw new AppError(401);

    const userCountry = normalizeCountry(user.location?.country);
    if (!userCountry) {
        throw new AppError(
            400,
            `Your account must have a registered country before creating a ${actionLabel}. Please complete your profile location.`
        );
    }

    // Rule 1: Target event/service country must match user's registered country
    const normalizedTarget = normalizeCountry(targetCountry);
    if (normalizedTarget && normalizedTarget !== userCountry) {
        throw new AppError(
            403,
            `Cross-border creation is prohibited for fraud prevention. Your profile is registered in ${countryDisplayName(
                userCountry
            )}, so you cannot create a ${actionLabel} in ${countryDisplayName(normalizedTarget)}.`
        );
    }

    // Rule 2: Client's physical IP address country must match user's registered country
    const ip = clientIp(req);
    const ipCountry = getCountryFromIp(ip, req);

    if (ipCountry && ipCountry !== userCountry) {
        throw new AppError(
            403,
            `Location mismatch detected (Fraud Prevention). Your network connection is located in ${countryDisplayName(
                ipCountry
            )}, which does not match your registered country (${countryDisplayName(
                userCountry
            )}). Operating from a foreign location or VPN is not permitted for creating a ${actionLabel}.`
        );
    }

    return true;
}
