/**
 * Footer routing config. Paths use Legal `docType` (`/legal/...`).
 *
 * - Legal CMS: Admin → Legal (active document only).
 * - Static pages: Admin → Static Pages; `name` must match `slug` below.
 */

export const FOOTER_ABOUT_ROUTE = { slug: "about", label: "About" } as const;

export const LEGAL_FOOTER_ROUTES = [
  {
    docType: "kvkk" as const,
    href: "/legal/kvkk",
    label: "KVKK notice",
  },
];

/** Middle footer links (after About and legal). */
export const STATIC_FOOTER_MIDDLE_ROUTES = [
  { slug: "terms-of-use", label: "Terms of use" },
  { slug: "privacy-policy", label: "Privacy policy" },
  { slug: "cookie-notice", label: "Cookie notice" },
] as const;

/** Trailing footer links: FAQ → Feedback → Contact. */
export const FOOTER_FEEDBACK_ROUTE = {
  href: "/feedback",
  label: "Feedback",
} as const;

export const FOOTER_FAQ_ROUTE = { slug: "faq", label: "FAQ" } as const;

export const FOOTER_CONTACT_ROUTE = { slug: "contact", label: "Contact" } as const;

/** All static page slugs (admin reference). */
export const STATIC_FOOTER_PAGE_ROUTES = [
  FOOTER_ABOUT_ROUTE,
  ...STATIC_FOOTER_MIDDLE_ROUTES,
  FOOTER_FAQ_ROUTE,
  FOOTER_CONTACT_ROUTE,
] as const;

export type StaticFooterSlug = (typeof STATIC_FOOTER_PAGE_ROUTES)[number]["slug"];
