"use client";

import Link from "next/link";
import {
  LEGAL_FOOTER_ROUTES,
  STATIC_FOOTER_PAGE_ROUTES,
} from "@/app/lib/footer-config";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-gray-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <nav
          className="flex flex-wrap gap-x-5 gap-y-2 justify-center sm:justify-start text-sm text-gray-600 dark:text-slate-400"
          aria-label="Footer links"
        >
          {LEGAL_FOOTER_ROUTES.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          ))}
          {STATIC_FOOTER_PAGE_ROUTES.map(({ slug, label }) => (
            <Link
              key={slug}
              href={`/sayfa/${slug}`}
              className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline-offset-2 hover:underline"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/feedback"
            className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors underline-offset-2 hover:underline font-medium text-cyan-700 dark:text-cyan-300"
          >
            Feedback form
          </Link>
        </nav>
        <p className="mt-4 text-center sm:text-left text-xs text-gray-400 dark:text-slate-500 max-w-3xl">
          Legal texts (KVKK, terms, distance selling, event contracts) are managed via{" "}
          <span className="font-medium text-gray-500 dark:text-slate-400">
            Admin → Legal
          </span>
          ; other pages via{" "}
          <span className="font-medium text-gray-500 dark:text-slate-400">
            Static Pages
          </span>
          . On static pages, the{" "}
          <code className="text-[11px] bg-gray-100 dark:bg-slate-800 px-1 rounded">
            name
          </code>{" "}
          field must match the footer slug (English slug list is on the Static Pages screen).
        </p>
      </div>
    </footer>
  );
}
