/**
 * Footer navigation (visible on every page).
 */

export const FOOTER_ABOUT_ROUTE = { slug: "about", label: "About" } as const;
export const FOOTER_FAQ_ROUTE = { slug: "faq", label: "FAQ" } as const;
export const FOOTER_CONTACT_ROUTE = { slug: "contact", label: "Contact" } as const;
export const FOOTER_CONTRACTS_ROUTE = {
  href: "/sozlesmeler",
  label: "Agreements",
} as const;
export const FOOTER_FEEDBACK_ROUTE = {
  href: "/feedback",
  label: "Feedback",
} as const;

type FooterNavStatic = { kind: "static"; slug: string; label: string };
type FooterNavRoute = { kind: "route"; href: string; label: string };

/** Order: About → FAQ → Feedback → Contact → Agreements */
export const FOOTER_NAV_LINKS: readonly (FooterNavStatic | FooterNavRoute)[] = [
  { kind: "static", slug: FOOTER_ABOUT_ROUTE.slug, label: FOOTER_ABOUT_ROUTE.label },
  { kind: "static", slug: FOOTER_FAQ_ROUTE.slug, label: FOOTER_FAQ_ROUTE.label },
  { kind: "route", href: FOOTER_FEEDBACK_ROUTE.href, label: FOOTER_FEEDBACK_ROUTE.label },
  { kind: "static", slug: FOOTER_CONTACT_ROUTE.slug, label: FOOTER_CONTACT_ROUTE.label },
  { kind: "route", href: FOOTER_CONTRACTS_ROUTE.href, label: FOOTER_CONTRACTS_ROUTE.label },
];

/** Static pages linked from the footer (admin Site pages checklist). */
export const STATIC_FOOTER_PAGE_ROUTES = [
  FOOTER_ABOUT_ROUTE,
  FOOTER_FAQ_ROUTE,
  FOOTER_CONTACT_ROUTE,
] as const;

export type StaticFooterSlug = (typeof STATIC_FOOTER_PAGE_ROUTES)[number]["slug"];
