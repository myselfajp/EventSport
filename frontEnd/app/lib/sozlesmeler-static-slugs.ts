/**
 * Admin → Statik Sayfalar: her kaydın `name` alanı bu değerlerden biri olmalı (küçük harf, tire).
 * `/sozlesmeler` bu isimlerle public API üzerinden içeriği çeker.
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
