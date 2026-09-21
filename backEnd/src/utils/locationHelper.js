import mongoose from 'mongoose';
import { District } from '../models/locationModel.js';

/** Apply location filter (Istanbul district only). */
export function applyLocationFilter(targetFilter, { district }, field = 'location.district') {
    if (district && mongoose.Types.ObjectId.isValid(district)) {
        targetFilter[field] = new mongoose.Types.ObjectId(district);
    }
}

export function pickLocationFromBody(body = {}) {
    const loc = {};
    if (body.country) loc.country = String(body.country).trim().toUpperCase();
    if (body.state) loc.state = String(body.state).trim();
    if (body.city) loc.city = String(body.city).trim();
    if (body.district) loc.district = body.district;
    if (body.districtName) loc.districtName = String(body.districtName).trim();
    if (body.postalCode) loc.postalCode = String(body.postalCode).trim();
    if (body.addressLine != null && String(body.addressLine).trim()) {
        loc.addressLine = String(body.addressLine).trim();
    }
    return Object.keys(loc).length > 0 ? loc : null;
}

export function normalizeLocationPayload(data = {}) {
    if (data.location && typeof data.location === 'object') {
        return pickLocationFromBody(data.location);
    }
    return pickLocationFromBody({
        country: data.country,
        state: data.state,
        city: data.city,
        district: data.district,
        districtName: data.districtName,
        postalCode: data.postalCode,
        addressLine: data.addressLine,
    });
}

export async function resolveLocationLabels(location) {
    if (!location) return [];
    const parts = [];
    if (location.districtName) {
        parts.push(location.districtName);
    } else if (location.district) {
        const doc = await District.findById(location.district).select('name').lean();
        if (doc?.name) parts.push(doc.name);
    }
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.addressLine) parts.push(location.addressLine);
    return parts;
}

export async function buildAddressString(location) {
    const parts = await resolveLocationLabels(location);
    if (parts.length === 0) return '';
    return parts.join(', ');
}

/** Turkish-aware slug used to match province / district names regardless of case or diacritics. */
export function trSlug(str) {
    return String(str || '')
        .replace(/İ/g, 'I')
        .replace(/I/g, 'i')
        .replace(/ı/g, 'i')
        .replace(/Ş/g, 'S')
        .replace(/ş/g, 's')
        .replace(/Ğ/g, 'G')
        .replace(/ğ/g, 'g')
        .replace(/Ü/g, 'U')
        .replace(/ü/g, 'u')
        .replace(/Ö/g, 'O')
        .replace(/ö/g, 'o')
        .replace(/Ç/g, 'C')
        .replace(/ç/g, 'c')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
}

/**
 * Resolve an Istanbul district name to its stored District ObjectId so that
 * district-based features (nearby events, notifications) keep working.
 * Returns null when the province is not Istanbul or no match is found.
 */
export async function resolveIstanbulDistrictId(provinceName, districtName) {
    if (trSlug(provinceName) !== 'istanbul' || !districtName) return null;
    const target = trSlug(districtName);
    const docs = await District.find({ region: 'istanbul' }).select('name').lean();
    const match = docs.find((d) => trSlug(d.name) === target);
    return match ? match._id : null;
}

/**
 * Build a country-agnostic locality key used to match users and events for
 * "nearby" features. The same function is used for both sides so equality means
 * "same locality". Returns '' when there is not enough data.
 *
 *  - US: `us:<stateSlug>:<citySlug>`
 *  - TR (and default): `tr:<provinceSlug>:<districtSlug>`
 */
export function buildLocationKey(loc = {}) {
    if (!loc) return '';
    const country = String(loc.country || '').trim().toUpperCase();
    if (country === 'US') {
        const st = trSlug(loc.state || loc.stateCode || '');
        const city = trSlug(loc.city || '');
        return st && city ? `us:${st}:${city}` : '';
    }
    // TR / default: province is stored in `city`, district in `districtName`.
    const province = trSlug(loc.city || loc.provinceSlug || '');
    const district = trSlug(loc.districtName || '');
    return province && district ? `tr:${province}:${district}` : '';
}

/**
 * Async variant that also handles legacy records which only carry the Istanbul
 * District ObjectId (no city/districtName). Falls back to resolving the stored
 * district name so existing Istanbul users/events still get a key.
 */
export async function resolveLocationKey(loc = {}) {
    if (!loc) return '';
    const direct = buildLocationKey(loc);
    if (direct) return direct;

    const country = String(loc.country || '').trim().toUpperCase();
    if (country !== 'US' && loc.district) {
        const doc = await District.findById(loc.district).select('name').lean();
        if (doc?.name) {
            return buildLocationKey({ country: 'TR', city: 'Istanbul', districtName: doc.name });
        }
    }
    return '';
}
