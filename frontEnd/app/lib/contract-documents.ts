/** Mirrors backEnd/src/constants/contractDocuments.js */

export type ContractCategory = "legal" | "gamer" | "coach";

export type LegalDocType =
  | "kvkk"
  | "terms"
  | "commercial_messages"
  | "cookie_policy"
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
  distance_selling: "Distance Selling Agreement",
  event_contract: "Event Agreement",
  coach_agreement: "Coach Agreement",
  coach_penalties: "Penalty Terms",
  coach_equipment: "Coach Equipment",
  coach_privacy: "Coach Privacy Agreement",
};

/** Turkish titles shown on site when admin title is empty. */
export const DEFAULT_TITLES_TR: Record<LegalDocType, string> = {
  kvkk: "KVKK Aydınlatma Metni",
  terms: "Kullanım Şartları",
  commercial_messages: "Ticari Elektronik İleti Onayı (IYS)",
  cookie_policy: "Çerez Politikası",
  distance_selling: "Mesafeli Satış Sözleşmesi",
  event_contract: "Etkinlik Sözleşmesi",
  coach_agreement: "Antrenör Sözleşmesi",
  coach_penalties: "Cezai Şartlar",
  coach_equipment: "Antrenör Donanımları",
  coach_privacy: "Antrenör Gizlilik Sözleşmesi",
};

export const CATEGORY_LABELS: Record<ContractCategory, string> = {
  legal: "Legal documents",
  gamer: "Player and event agreements",
  coach: "Coach agreements",
};

/** Public /sozlesmeler section headings (Turkish). */
export const CATEGORY_LABELS_TR: Record<ContractCategory, string> = {
  legal: "Yasal metinler",
  gamer: "Oyuncu ve etkinlik sözleşmeleri",
  coach: "Antrenör sözleşmeleri",
};

export const SOZLESMELER_SECTION_ANCHORS: Record<LegalDocType, string> = {
  kvkk: "kvkk",
  terms: "terms",
  commercial_messages: "commercial-messages",
  cookie_policy: "cookie-policy",
  distance_selling: "distance-selling",
  event_contract: "event-contract",
  coach_agreement: "coach-agreement",
  coach_penalties: "coach-penalties",
  coach_equipment: "coach-equipment",
  coach_privacy: "coach-privacy",
};

/** Legacy static slugs → redirect to /sozlesmeler section */
export const LEGACY_STATIC_CONTRACT_REDIRECTS: Record<string, string> = {
  "sozlesmeler-antrenor": "/sozlesmeler#coach-agreement",
  "sozlesmeler-ek-1": "/sozlesmeler#coach-equipment",
  "sozlesmeler-ek-2": "/sozlesmeler#coach-penalties",
  "sozlesmeler-ek-3": "/sozlesmeler#coach-privacy",
  "mesafeli-satis-sozlesmesi": "/sozlesmeler#distance-selling",
  "etkinlik-satin-alma-kosullari": "/sozlesmeler#event-contract",
};

export function isLegalDocType(v: string): v is LegalDocType {
  return (ALL_CONTRACT_DOC_TYPES as string[]).includes(v);
}
