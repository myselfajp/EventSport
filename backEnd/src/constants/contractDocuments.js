/** Contract categories (English keys). */
export const CONTRACT_CATEGORIES = ['legal', 'gamer', 'coach'];

export const LEGAL_DOC_TYPES = ['kvkk', 'terms', 'commercial_messages'];
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

/** Turkish display titles (content language); keys stay English. */
export const DEFAULT_TITLES_TR = {
    kvkk: 'KVKK Aydınlatma Metni',
    terms: 'Kullanım Şartları',
    commercial_messages: 'Ticari Elektronik İleti Onayı (IYS)',
    distance_selling: 'Mesafeli Satış Sözleşmesi',
    event_contract: 'Etkinlik Sözleşmesi',
    coach_agreement: 'Antrenör Sözleşmesi',
    coach_penalties: 'Cezai Şartlar',
    coach_equipment: 'Antrenör Donanımları',
    coach_privacy: 'Antrenör Gizlilik Sözleşmesi',
};

/** Coach profile signup must accept all active versions of these types. */
export const COACH_PROFILE_REQUIRED_DOC_TYPES = [...COACH_DOC_TYPES];

/**
 * Legacy static page slugs → redirect target (path + hash on /sozlesmeler).
 */
export const LEGACY_STATIC_CONTRACT_REDIRECTS = {
    'sozlesmeler-antrenor': '/sozlesmeler#coach-agreement',
    'sozlesmeler-ek-1': '/sozlesmeler#coach-equipment',
    'sozlesmeler-ek-2': '/sozlesmeler#coach-penalties',
    'sozlesmeler-ek-3': '/sozlesmeler#coach-privacy',
    'mesafeli-satis-sozlesmesi': '/sozlesmeler#distance-selling',
    'etkinlik-satin-alma-kosullari': '/sozlesmeler#event-contract',
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

/** Anchor ids on /sozlesmeler page (English). */
export const SOZLESMELER_SECTION_ANCHORS = {
    kvkk: 'kvkk',
    terms: 'terms',
    commercial_messages: 'commercial-messages',
    distance_selling: 'distance-selling',
    event_contract: 'event-contract',
    coach_agreement: 'coach-agreement',
    coach_penalties: 'coach-penalties',
    coach_equipment: 'coach-equipment',
    coach_privacy: 'coach-privacy',
};

export function getCategoryForDocType(docType) {
    return DOC_TYPE_TO_CATEGORY[docType] || null;
}

export function isContractDocType(docType) {
    return ALL_CONTRACT_DOC_TYPES.includes(docType);
}
