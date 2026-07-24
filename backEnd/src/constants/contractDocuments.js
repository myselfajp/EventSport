/** Contract categories (English keys). */
export const CONTRACT_CATEGORIES = ['legal', 'gamer', 'coach'];

export const LEGAL_DOC_TYPES = [
    'kvkk',
    'terms',
    'commercial_messages',
    'cookie_policy',
    'coach_me_consent',
];
export const GAMER_DOC_TYPES = ['distance_selling', 'event_contract'];
export const COACH_DOC_TYPES = [
    'coach_agreement',
    'coach_penalties',
    'coach_equipment',
    'coach_privacy',
];

export const ALL_CONTRACT_DOC_TYPES = [
    ...LEGAL_DOC_TYPES,
    ...GAMER_DOC_TYPES,
    ...COACH_DOC_TYPES,
];

export const DOC_TYPE_TO_CATEGORY = Object.fromEntries([
    ...LEGAL_DOC_TYPES.map((t) => [t, 'legal']),
    ...GAMER_DOC_TYPES.map((t) => [t, 'gamer']),
    ...COACH_DOC_TYPES.map((t) => [t, 'coach']),
]);

/** Default English display titles when admin title is empty. */
export const DEFAULT_TITLES = {
    kvkk: 'KVKK Privacy Notice',
    terms: 'Terms of Use',
    commercial_messages: 'Commercial Electronic Messages Consent (IYS)',
    cookie_policy: 'Cookie Policy',
    coach_me_consent: 'Coach Me Email Contact Consent',
    distance_selling: 'Distance Selling Agreement',
    event_contract: 'Event Agreement',
    coach_agreement: 'Coach Agreement',
    coach_penalties: 'Penalty Terms',
    coach_equipment: 'Coach Equipment',
    coach_privacy: 'Coach Privacy Agreement',
};

/** @deprecated Use DEFAULT_TITLES */
export const DEFAULT_TITLES_TR = DEFAULT_TITLES;

/** Coach profile signup must accept all active versions of these types. */
export const COACH_PROFILE_REQUIRED_DOC_TYPES = [...COACH_DOC_TYPES];

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
