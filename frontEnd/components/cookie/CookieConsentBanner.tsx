"use client";

import Link from "next/link";
import { useMemo } from "react";

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
  onManagePreferences: () => void;
  policyDoc?: {
    title: string;
    content: string;
  } | null;
}

function getSnippetFromHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function CookieConsentBanner({
  onAcceptAll,
  onEssentialOnly,
  onManagePreferences,
  policyDoc,
}: CookieConsentBannerProps) {
  const title = policyDoc?.title?.trim() || "Cookie management";

  const description = useMemo(() => {
    if (policyDoc?.content?.trim()) {
      const snippet = getSnippetFromHtml(policyDoc.content);
      if (snippet.length > 200) {
        return `${snippet.slice(0, 200)}...`;
      }
      if (snippet.length > 0) {
        return snippet;
      }
    }
    return "We use cookies and similar technologies for security, preferences, and (optionally) analytics. You can accept all, allow only essential cookies, or choose categories.";
  }, [policyDoc]);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-4 sm:p-6 pointer-events-none"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-black/10 dark:shadow-black/40">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <Link
              href="/contracts#cookie-policy"
              className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 hover:underline font-medium shrink-0"
            >
              Full Policy
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            {description}{" "}
            <Link
              href="/contracts#cookie-policy"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              See details
            </Link>
            .
          </p>

          <div className="mt-4 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onEssentialOnly}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 transition-colors"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={onManagePreferences}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-950/60 rounded-lg border border-cyan-200 dark:border-cyan-800 transition-colors"
            >
              Manage preferences
            </button>
            <button
              type="button"
              onClick={onAcceptAll}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-sm"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
