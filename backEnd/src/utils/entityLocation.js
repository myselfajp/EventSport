import { buildAddressString, normalizeLocationPayload, pickLocationFromBody } from './locationHelper.js';

/**
 * Build document fields: location subdocument + legacy address string.
 */
export async function resolveEntityLocationFields(data = {}) {
    const location = normalizeLocationPayload(data);
    let address = data.address != null ? String(data.address).trim() : '';
    if (location) {
        const built = await buildAddressString(location);
        if (built) address = built;
    }
    const out = {};
    if (location) out.location = location;
    if (address) out.address = address;
    return out;
}

/** Strip flat location keys and attach location + address on entity payload. */
export async function mergeLocationIntoPayload(payload = {}) {
    const locFields = await resolveEntityLocationFields(payload);
    const next = { ...payload };
    delete next.country;
    delete next.state;
    delete next.city;
    delete next.district;
    delete next.addressLine;
    return { ...next, ...locFields };
}

export { pickLocationFromBody, normalizeLocationPayload };
