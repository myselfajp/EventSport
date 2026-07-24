/** Mirrors backEnd/src/constants/contractDocuments.js */

export type ContractCategory = "legal" | "gamer" | "coach";

export type LegalDocType =
  | "kvkk"
  | "terms"
  | "commercial_messages"
  | "cookie_policy"
  | "coach_me_consent"
  | "distance_selling"
  | "event_contract"
  | "coach_agreement"
  | "coach_penalties"
  | "coach_equipment"
  | "coach_privacy";

export const LEGAL_DOC_TYPES: LegalDocType[] = [
  "kvkk",
  "terms",
  "commercial_messages",
  "cookie_policy",
  "coach_me_consent",
];

export const GAMER_DOC_TYPES: LegalDocType[] = [
  "distance_selling",
  "event_contract",
];

export const COACH_DOC_TYPES: LegalDocType[] = [
  "coach_agreement",
  "coach_penalties",
  "coach_equipment",
  "coach_privacy",
];

export const ALL_CONTRACT_DOC_TYPES: LegalDocType[] = [
  ...LEGAL_DOC_TYPES,
  ...GAMER_DOC_TYPES,
  ...COACH_DOC_TYPES,
];

export const DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  kvkk: "KVKK",
  terms: "Terms & Conditions",
  commercial_messages: "Commercial Electronic Messages Consent (IYS)",
  cookie_policy: "Cookie Policy",
  coach_me_consent: "Coach Me Email Contact Consent",
  distance_selling: "Distance Selling Agreement",
  event_contract: "Event Agreement",
  coach_agreement: "Coach Agreement",
  coach_penalties: "Penalty Terms",
  coach_equipment: "Coach Equipment",
  coach_privacy: "Coach Privacy Agreement",
};

/** Default titles shown on site when admin title is empty. */
export const DEFAULT_TITLES: Record<LegalDocType, string> = {
  kvkk: "KVKK Privacy Notice",
  terms: "Terms of Use",
  commercial_messages: "Commercial Electronic Messages Consent (IYS)",
  cookie_policy: "Cookie Policy",
  coach_me_consent: "Coach Me Email Contact Consent",
  distance_selling: "Distance Selling Agreement",
  event_contract: "Event Agreement",
  coach_agreement: "Coach Agreement",
  coach_penalties: "Penalty Terms",
  coach_equipment: "Coach Equipment",
  coach_privacy: "Coach Privacy Agreement",
};

/** @deprecated Use DEFAULT_TITLES */
export const DEFAULT_TITLES_TR = DEFAULT_TITLES;

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  legal: "Legal documents",
  gamer: "Player and event agreements",
  coach: "Coach agreements",
};

export const CONTRACTS_SECTION_ANCHORS: Record<LegalDocType, string> = {
  kvkk: "kvkk",
  terms: "terms",
  commercial_messages: "commercial-messages",
  cookie_policy: "cookie-policy",
  coach_me_consent: "coach-me-consent",
  distance_selling: "distance-selling",
  event_contract: "event-contract",
  coach_agreement: "coach-agreement",
  coach_penalties: "coach-penalties",
  coach_equipment: "coach-equipment",
  coach_privacy: "coach-privacy",
};

/** @deprecated Use CONTRACTS_SECTION_ANCHORS */
export const SOZLESMELER_SECTION_ANCHORS = CONTRACTS_SECTION_ANCHORS;

/** Legacy static slugs → redirect to /contracts section */
export const LEGACY_STATIC_CONTRACT_REDIRECTS: Record<string, string> = {
  "sozlesmeler-antrenor": "/contracts#coach-agreement",
  "sozlesmeler-ek-1": "/contracts#coach-equipment",
  "sozlesmeler-ek-2": "/contracts#coach-penalties",
  "sozlesmeler-ek-3": "/contracts#coach-privacy",
  "mesafeli-satis-sozlesmesi": "/contracts#distance-selling",
  "etkinlik-satin-alma-kosullari": "/contracts#event-contract",
};

export function isLegalDocType(v: string): v is LegalDocType {
  return (ALL_CONTRACT_DOC_TYPES as string[]).includes(v);
}
