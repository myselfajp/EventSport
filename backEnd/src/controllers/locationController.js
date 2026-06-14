import { District } from '../models/locationModel.js';
import { TURKEY_PROVINCES } from '../data/turkey-provinces.js';
import { US_STATES } from '../data/us-states.js';

const REGION = 'istanbul';

// The product only supports Turkey and the United States.
const SUPPORTED_COUNTRIES = [
    { code: 'TR', name: 'Türkiye' },
    { code: 'US', name: 'United States' },
];

const COUNTRY_NAMES = {
    TR: 'Türkiye',
    US: 'United States',
};

const PROVINCE_BY_SLUG = new Map(TURKEY_PROVINCES.map((p) => [p.slug, p]));
const STATE_BY_CODE = new Map(US_STATES.map((s) => [s.code, s]));

function normalizeCountryCode(value) {
    const code = String(value || '').trim().toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : '';
}

/** Collapse any detected country into the two supported ones (default TR). */
function toSupportedCountry(code) {
    return normalizeCountryCode(code) === 'US' ? 'US' : 'TR';
}

function countryNameFor(code) {
    if (!code) return '';
    try {
        return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || COUNTRY_NAMES[code] || code;
    } catch {
        return COUNTRY_NAMES[code] || code;
    }
}

function countryFromHeaders(req) {
    const headers = [
        'cf-ipcountry',
        'x-vercel-ip-country',
        'x-country-code',
        'cloudfront-viewer-country',
        'x-appengine-country',
    ];
    for (const h of headers) {
        const code = normalizeCountryCode(req.headers[h]);
        if (code) return code;
    }
    return '';
}

function countryFromAcceptLanguage(req) {
    const raw = String(req.headers['accept-language'] || '');
    const matches = raw.matchAll(/(?:^|,)\s*[a-z]{2,3}-([A-Za-z]{2})/g);
    for (const match of matches) {
        const code = normalizeCountryCode(match[1]);
        if (code) return code;
    }
    if (/^tr\b/i.test(raw)) return 'TR';
    return '';
}

function clientIp(req) {
    const forwarded = String(req.headers['x-forwarded-for'] || '')
        .split(',')
        .map((part) => part.trim())
        .find(Boolean);
    const raw = forwarded || req.ip || req.socket?.remoteAddress || '';
    return String(raw).replace(/^::ffff:/, '').trim();
}

function isPublicIp(ip) {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') return false;
    if (/^(10|127)\./.test(ip)) return false;
    if (/^192\.168\./.test(ip)) return false;
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return false;
    if (/^169\.254\./.test(ip)) return false;
    if (/^fc|^fd/i.test(ip)) return false;
    return true;
}

async function lookupIpLocation(ip) {
    if (!isPublicIp(ip) || typeof fetch !== 'function') return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);
    try {
        const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
            signal: controller.signal,
            headers: { Accept: 'application/json' },
        });
        if (!res.ok) return null;
        const data = await res.json();
        const countryCode = normalizeCountryCode(data?.country_code);
        if (!countryCode) return null;
        return {
            countryCode,
            countryName: data?.country_name || countryNameFor(countryCode),
            state: data?.region || '',
            city: data?.city || '',
            postalCode: data?.postal || '',
            source: 'ip',
        };
    } catch {
        return null;
    } finally {
        clearTimeout(timeout);
    }
}

export const getIstanbulDistricts = async (req, res, next) => {
    try {
        const districts = await District.find({ region: REGION })
            .sort({ name: 1 })
            .select('name region')
            .lean();
        res.status(200).json({ success: true, data: districts });
    } catch (err) {
        next(err);
    }
};

/** Build the detect response, collapsing to TR/US and only prefilling US fields. */
function buildDetectResponse(rawCountry, source, extras = {}) {
    const countryCode = toSupportedCountry(rawCountry);
    return {
        countryCode,
        countryName: COUNTRY_NAMES[countryCode],
        state: countryCode === 'US' ? extras.state || '' : '',
        city: countryCode === 'US' ? extras.city || '' : '',
        postalCode: countryCode === 'US' ? extras.postalCode || '' : '',
        source,
    };
}

export const getCountries = (_req, res) => {
    res.status(200).json({ success: true, data: SUPPORTED_COUNTRIES });
};

export const getTurkeyProvinces = (_req, res) => {
    const data = TURKEY_PROVINCES.map((p) => ({ slug: p.slug, name: p.name }));
    res.status(200).json({ success: true, data });
};

export const getTurkeyDistricts = (req, res) => {
    const slug = String(req.query.province || req.body?.province || '').trim().toLowerCase();
    const province = PROVINCE_BY_SLUG.get(slug);
    res.status(200).json({ success: true, data: province ? province.districts : [] });
};

export const getUsStates = (_req, res) => {
    const data = US_STATES.map((s) => ({ code: s.code, name: s.name }));
    res.status(200).json({ success: true, data });
};

export const getUsCities = (req, res) => {
    const code = String(req.query.state || req.body?.state || '').trim().toUpperCase();
    const state = STATE_BY_CODE.get(code);
    res.status(200).json({ success: true, data: state ? state.cities : [] });
};

export const detectLocation = async (req, res, next) => {
    try {
        const headerCountry = countryFromHeaders(req);
        if (headerCountry) {
            return res
                .status(200)
                .json({ success: true, data: buildDetectResponse(headerCountry, 'header') });
        }

        const ipLocation = await lookupIpLocation(clientIp(req));
        if (ipLocation) {
            return res.status(200).json({
                success: true,
                data: buildDetectResponse(ipLocation.countryCode, 'ip', {
                    state: ipLocation.state,
                    city: ipLocation.city,
                    postalCode: ipLocation.postalCode,
                }),
            });
        }

        const languageCountry = countryFromAcceptLanguage(req) || 'TR';
        res.status(200).json({
            success: true,
            data: buildDetectResponse(
                languageCountry,
                languageCountry === 'TR' ? 'default' : 'locale'
            ),
        });
    } catch (err) {
        next(err);
    }
};
