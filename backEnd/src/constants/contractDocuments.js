/** Contract categories (English keys). */
export const CONTRACT_CATEGORIES = ['legal', 'gamer', 'coach', 'cookie'];

export const LEGAL_DOC_TYPES = [
    'kvkk',
    'terms',
    'commercial_messages',
    'coach_me_consent',
];
export const GAMER_DOC_TYPES = ['distance_selling', 'event_contract'];
export const COACH_DOC_TYPES = [
    'coach_distance_selling',
    'coach_agreement',
    'coach_penalties',
    'coach_equipment',
    'coach_privacy',
];
export const COOKIE_DOC_TYPES = ['cookie_policy'];

export const ALL_CONTRACT_DOC_TYPES = [
    ...new Set([...LEGAL_DOC_TYPES, ...GAMER_DOC_TYPES, ...COACH_DOC_TYPES, ...COOKIE_DOC_TYPES]),
];

export const DOC_TYPE_TO_CATEGORY = Object.fromEntries([
    ...LEGAL_DOC_TYPES.map((t) => [t, 'legal']),
    ...GAMER_DOC_TYPES.map((t) => [t, 'gamer']),
    ...COACH_DOC_TYPES.map((t) => [t, 'coach']),
    ...COOKIE_DOC_TYPES.map((t) => [t, 'cookie']),
]);

/** Default English display titles when admin title is empty. */
export const DEFAULT_TITLES = {
    kvkk: 'KVKK Privacy Notice',
    terms: 'Terms of Use',
    commercial_messages: 'Commercial Electronic Messages Consent (IYS)',
    cookie_policy: 'Cookie Policy',
    coach_me_consent: 'Coach Me Email Contact Consent',
    distance_selling: 'Distance Selling Agreement (Athlete)',
    coach_distance_selling: 'Distance Selling Agreement (Provider)',
    event_contract: 'Event Agreement',
    coach_agreement: 'Provider Agreement',
    coach_penalties: 'Penalty Terms',
    coach_equipment: 'Provider Equipment',
    coach_privacy: 'Provider Privacy Agreement',
};

/** @deprecated Use DEFAULT_TITLES */
export const DEFAULT_TITLES_TR = DEFAULT_TITLES;

/** These document types must stay on an enabled + required registration checkbox. */
export const LOCKED_SIGNUP_DOC_TYPES = ['terms', 'kvkk'];

/** System types that cannot be renamed or deleted from admin. */
export const LOCKED_LEGAL_DOC_TYPES = [
    'terms',
    'kvkk',
    'cookie_policy',
    'commercial_messages',
];

/** Seed rows for the account-creation checkbox list. */
export const DEFAULT_SIGNUP_CONSENTS = [
    {
        checkboxLabel: 'I agree to the {{terms}}.',
        docTypes: ['terms'],
        required: true,
        enabled: true,
        sortOrder: 1,
    },
    {
        checkboxLabel: 'I agree to the {{kvkk}}.',
        docTypes: ['kvkk'],
        required: true,
        enabled: true,
        sortOrder: 2,
    },
    {
        checkboxLabel:
            'I consent to receiving commercial electronic messages (SMS, email, phone) including campaigns and promotions. I have read the {{commercial_messages}}. (Optional)',
        docTypes: ['commercial_messages'],
        required: false,
        enabled: true,
        sortOrder: 3,
    },
];

/** Provider (coach / performance) profile signup must accept all active versions of these types. */
export const COACH_PROFILE_REQUIRED_DOC_TYPES = [
    'coach_agreement',
    'coach_penalties',
    'coach_equipment',
    'coach_privacy',
];
export const PROVIDER_PROFILE_REQUIRED_DOC_TYPES = COACH_PROFILE_REQUIRED_DOC_TYPES;

/**
 * Legacy static page slugs → redirect target (path + hash on /contracts).
 * Old /sozlesmeler URLs are also redirected at the app layer.
 */
export const LEGACY_STATIC_CONTRACT_REDIRECTS = {
    'sozlesmeler-antrenor': '/contracts#coach-agreement',
    'sozlesmeler-ek-1': '/contracts#coach-equipment',
    'sozlesmeler-ek-2': '/contracts#coach-penalties',
    'sozlesmeler-ek-3': '/contracts#coach-privacy',
    'mesafeli-satis-sozlesmesi': '/contracts#distance-selling',
    'etkinlik-satin-alma-kosullari': '/contracts#event-contract',
};

/** Old static slug → new legal docType (for one-time content migration). */
export const LEGACY_STATIC_TO_DOC_TYPE = {
    'sozlesmeler-antrenor': 'coach_agreement',
    'sozlesmeler-ek-1': 'coach_equipment',
    'sozlesmeler-ek-2': 'coach_penalties',
    'sozlesmeler-ek-3': 'coach_privacy',
    'mesafeli-satis-sozlesmesi': 'distance_selling',
    'etkinlik-satin-alma-kosullari': 'event_contract',
};

/** Anchor ids on /contracts page. */
export const CONTRACTS_SECTION_ANCHORS = {
    kvkk: 'kvkk',
    terms: 'terms',
    commercial_messages: 'commercial-messages',
    cookie_policy: 'cookie-policy',
    coach_me_consent: 'coach-me-consent',
    distance_selling: 'distance-selling',
    coach_distance_selling: 'coach-distance-selling',
    event_contract: 'event-contract',
    coach_agreement: 'coach-agreement',
    coach_penalties: 'coach-penalties',
    coach_equipment: 'coach-equipment',
    coach_privacy: 'coach-privacy',
};

/** @deprecated Use CONTRACTS_SECTION_ANCHORS */
export const SOZLESMELER_SECTION_ANCHORS = CONTRACTS_SECTION_ANCHORS;

export function getCategoryForDocType(docType) {
    return DOC_TYPE_TO_CATEGORY[docType] || null;
}

export function isContractDocType(docType) {
    return ALL_CONTRACT_DOC_TYPES.includes(docType);
}
