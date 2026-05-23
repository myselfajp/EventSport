/**
 * Footer routing config. Paths use Legal `docType` (`/legal/...`).
 *
 * - Legal CMS: Admin → Legal (active document only).
 * - Static pages: Admin → Static Pages; `name` must match `slug` below.
 */

export const LEGAL_FOOTER_ROUTES = [
  {
    docType: "kvkk" as const,
    href: "/legal/kvkk",
    label: "KVKK notice",
  },
  {
    docType: "terms" as const,
    href: "/legal/terms",
    label: "Terms and conditions",
  },
  {
    docType: "distance_selling" as const,
    href: "/legal/distance_selling",
    label: "Mesafeli satış sözleşmesi",
  },
  {
    docType: "event_contract" as const,
    href: "/legal/event_contract",
    label: "Etkinlik sözleşmesi",
  },
];

export const STATIC_FOOTER_PAGE_ROUTES = [
  { slug: "terms-of-use", label: "Terms of use" },
  { slug: "privacy-policy", label: "Privacy policy" },
  {
    slug: "cookie-notice",
    label: "Cookie notice / cookie disclosure",
  },
  { slug: "about", label: "About" },
  { slug: "contact", label: "Contact" },
  { slug: "faq", label: "FAQ" },
] as const;

export type StaticFooterSlug = (typeof STATIC_FOOTER_PAGE_ROUTES)[number]["slug"];
