/** Mirrors backEnd/src/constants/contractDocuments.js */

export type ContractCategory = "legal" | "gamer" | "coach" | "cookie";

export type LegalDocType =
  | "kvkk"
  | "terms"
  | "commercial_messages"
  | "cookie_policy"
  | "coach_me_consent"
  | "distance_selling"
  | "coach_distance_selling"
  | "event_contract"
  | "coach_agreement"
  | "coach_penalties"
  | "coach_equipment"
  | "coach_privacy";

export const LEGAL_DOC_TYPES: LegalDocType[] = [
  "kvkk",
  "terms",
  "commercial_messages",
  "coach_me_consent",
];

export const GAMER_DOC_TYPES: LegalDocType[] = [
  "distance_selling",
  "event_contract",
];

export const COACH_DOC_TYPES: LegalDocType[] = [
  "coach_distance_selling",
  "coach_agreement",
  "coach_penalties",
  "coach_equipment",
  "coach_privacy",
];

export const COOKIE_DOC_TYPES: LegalDocType[] = ["cookie_policy"];

export const ALL_CONTRACT_DOC_TYPES: LegalDocType[] = [
  ...new Set([...LEGAL_DOC_TYPES, ...GAMER_DOC_TYPES, ...COACH_DOC_TYPES, ...COOKIE_DOC_TYPES]),
];

export const DOC_TYPE_LABELS: Record<LegalDocType, string> = {
  kvkk: "KVKK",
  terms: "Terms & Conditions",
  commercial_messages: "Commercial Electronic Messages Consent (IYS)",
  cookie_policy: "Cookie Policy",
  coach_me_consent: "Coach Me Email Contact Consent",
  distance_selling: "Distance Selling Agreement (Athlete)",
  coach_distance_selling: "Distance Selling Agreement (Provider)",
  event_contract: "Event Agreement",
  coach_agreement: "Provider Agreement",
  coach_penalties: "Penalty Terms",
  coach_equipment: "Provider Equipment",
  coach_privacy: "Provider Privacy Agreement",
};

/** Default titles shown on site when admin title is empty. */
export const DEFAULT_TITLES: Record<LegalDocType, string> = {
  kvkk: "KVKK Privacy Notice",
  terms: "Terms of Use",
  commercial_messages: "Commercial Electronic Messages Consent (IYS)",
  cookie_policy: "Cookie Policy",
  coach_me_consent: "Coach Me Email Contact Consent",
  distance_selling: "Distance Selling Agreement (Athlete)",
  coach_distance_selling: "Distance Selling Agreement (Provider)",
  event_contract: "Event Agreement",
  coach_agreement: "Provider Agreement",
  coach_penalties: "Penalty Terms",
  coach_equipment: "Provider Equipment",
  coach_privacy: "Provider Privacy Agreement",
};

/** @deprecated Use DEFAULT_TITLES */
export const DEFAULT_TITLES_TR = DEFAULT_TITLES;

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  legal: "Legal Documents",
  gamer: "Athlete Agreements",
  coach: "Provider Agreements",
  cookie: "Cookie Management",
};

export const COOKIE_PREFERENCES_NAV_ID = "__cookie_preferences";
export const COOKIE_PREFERENCES_ANCHOR = "cookie-preferences";

export const LOCKED_LEGAL_DOC_TYPES = [
  "terms",
  "kvkk",
  "cookie_policy",
  "commercial_messages",
] as const;

export const CONTRACTS_SECTION_ANCHORS: Record<LegalDocType, string> = {
  kvkk: "kvkk",
  terms: "terms",
  commercial_messages: "commercial-messages",
  cookie_policy: "cookie-policy",
  coach_me_consent: "coach-me-consent",
  distance_selling: "distance-selling",
  coach_distance_selling: "coach-distance-selling",
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

/** Must remain on an enabled + required registration checkbox. */
export const LOCKED_SIGNUP_DOC_TYPES = ["terms", "kvkk"] as const;

export type SignupConsentDocument = {
  _id: string;
  docType: string;
  title: string;
  content: string;
  version: number;
};

export type SignupConsentItem = {
  _id: string;
  checkboxLabel: string;
  docTypes: string[];
  required: boolean;
  sortOrder: number;
  enabled?: boolean;
  documents: SignupConsentDocument[];
};

export function getDocTypeLabel(docType: string): string {
  return (
    (DOC_TYPE_LABELS as Record<string, string>)[docType] ||
    docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

export function splitConsentLabel(
  label: string
): Array<{ type: "text" | "token"; value: string }> {
  const parts: Array<{ type: "text" | "token"; value: string }> = [];
  for (const part of label.split(/(\{\{[a-z0-9_-]+\}\})/gi)) {
    if (!part) continue;
    const match = part.match(/^\{\{([a-z0-9_-]+)\}\}$/i);
    if (match) {
      parts.push({ type: "token", value: match[1] });
    } else {
      parts.push({ type: "text", value: part });
    }
  }
  return parts;
}
