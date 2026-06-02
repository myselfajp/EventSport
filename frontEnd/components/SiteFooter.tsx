"use client";

import Link from "next/link";
import { FOOTER_NAV_LINKS } from "@/app/lib/footer-config";

const linkClass =
  "px-2 py-1 text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100 transition-colors duration-200";

function footerHref(item: (typeof FOOTER_NAV_LINKS)[number]): string {
  return item.kind === "static" ? `/sayfa/${item.slug}` : item.href;
}

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200/90 dark:border-slate-800 bg-gradient-to-b from-white via-white to-gray-50/90 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950/90">
      <div className="max-w-6xl mx-auto px-4 py-8 sm:py-10">
        <nav
          className="flex flex-wrap items-center justify-center gap-y-2 text-sm tracking-wide"
          aria-label="Footer navigation"
        >
          {FOOTER_NAV_LINKS.map((item, index) => (
            <span key={footerHref(item)} className="inline-flex items-center">
              {index > 0 && (
                <span
                  className="mx-2 sm:mx-3 text-gray-300 dark:text-slate-600 select-none"
                  aria-hidden
                >
                  ·
                </span>
              )}
              <Link href={footerHref(item)} className={linkClass}>
                {item.label}
              </Link>
            </span>
          ))}
        </nav>
      </div>
    </footer>
  );
}
