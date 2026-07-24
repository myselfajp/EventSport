/**
 * @deprecated Contract content moved to Legal API. Use contract-documents.ts.
 * Legacy slugs kept for redirects only.
 */
export const LEGACY_CONTRACT_STATIC_SLUGS = [
  "sozlesmeler-antrenor",
  "sozlesmeler-ek-1",
  "sozlesmeler-ek-2",
  "sozlesmeler-ek-3",
  "mesafeli-satis-sozlesmesi",
  "etkinlik-satin-alma-kosullari",
] as const;

/** @deprecated Use LEGACY_CONTRACT_STATIC_SLUGS */
export const SOZLESMELER_STATIC_SLUGS = LEGACY_CONTRACT_STATIC_SLUGS;

export type LegacyContractStaticSlug = (typeof LEGACY_CONTRACT_STATIC_SLUGS)[number];

/** @deprecated Use LegacyContractStaticSlug */
export type SozlesmelerStaticSlug = LegacyContractStaticSlug;
