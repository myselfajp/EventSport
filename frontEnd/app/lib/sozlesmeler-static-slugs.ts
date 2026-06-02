/**
 * @deprecated Contract content moved to Legal API. Use contract-documents.ts.
 * Legacy slugs kept for redirects only.
 */
export const SOZLESMELER_STATIC_SLUGS = [
  "sozlesmeler-antrenor",
  "sozlesmeler-ek-1",
  "sozlesmeler-ek-2",
  "sozlesmeler-ek-3",
  "mesafeli-satis-sozlesmesi",
  "etkinlik-satin-alma-kosullari",
] as const;

export type SozlesmelerStaticSlug = (typeof SOZLESMELER_STATIC_SLUGS)[number];
