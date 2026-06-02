import { STATIC_FOOTER_PAGE_ROUTES } from "./footer-config";

export type SitePageTemplate = {
  slug: string;
  title: string;
  order: number;
  content: string;
  footerLabel: string;
};

/** Footer-linked pages — slug must match exactly for footer links to work. */
export const FOOTER_SITE_PAGE_TEMPLATES: SitePageTemplate[] = STATIC_FOOTER_PAGE_ROUTES.map(
  (route, index) => ({
    slug: route.slug,
    title: route.label,
    footerLabel: route.label,
    order: index,
    content: `<h1>${route.label}</h1>\n<p>Add your content here.</p>`,
  })
);

/** Map common titles (and wrong slugs) to the footer slug the site expects. */
const TITLE_TO_FOOTER_SLUG: Record<string, string> = {
  about: "about",
  "about us": "about",
  "about-us": "about",
  faq: "faq",
  "frequently asked questions": "faq",
  contact: "contact",
  "contact us": "contact",
};

export const FOOTER_SLUG_SET = new Set(
  FOOTER_SITE_PAGE_TEMPLATES.map((t) => t.slug)
);

export function normalizePageSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Suggest URL slug from page title; prefers known footer slugs over generic slugify. */
export function suggestSlugFromTitle(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) return "";

  const key = trimmed.toLowerCase();
  if (TITLE_TO_FOOTER_SLUG[key]) {
    return TITLE_TO_FOOTER_SLUG[key];
  }

  const slug = normalizePageSlug(trimmed.replace(/\s+/g, "-"));
  if (TITLE_TO_FOOTER_SLUG[slug]) {
    return TITLE_TO_FOOTER_SLUG[slug];
  }

  return slug;
}

export function isValidPageSlug(slug: string): boolean {
  return /^[a-z0-9-]{1,80}$/.test(slug);
}

export function publicPagePath(slug: string): string {
  return `/sayfa/${slug}`;
}
