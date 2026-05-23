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
    if (body.district) loc.district = body.district;
    if (body.addressLine != null && String(body.addressLine).trim()) {
        loc.addressLine = String(body.addressLine).trim();
    }
    return loc.district || loc.addressLine ? loc : null;
}

export function normalizeLocationPayload(data = {}) {
    if (data.location && typeof data.location === 'object') {
        return pickLocationFromBody(data.location);
    }
    return pickLocationFromBody({
        district: data.district,
        addressLine: data.addressLine,
    });
}

export async function resolveLocationLabels(location) {
    if (!location) return [];
    const parts = [];
    if (location.district) {
        const doc = await District.findById(location.district).select('name').lean();
        if (doc?.name) parts.push(doc.name);
    }
    if (location.addressLine) parts.push(location.addressLine);
    return parts;
}

export async function buildAddressString(location) {
    const parts = await resolveLocationLabels(location);
    if (parts.length === 0) return '';
    const districtName = parts[0];
    const rest = parts.slice(1).join(', ');
    return rest ? `${districtName}, ${rest}` : `${districtName}, İstanbul`;
}
