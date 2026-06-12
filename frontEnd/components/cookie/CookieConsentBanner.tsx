"use client";

import Link from "next/link";

interface CookieConsentBannerProps {
  onAcceptAll: () => void;
  onEssentialOnly: () => void;
  onManagePreferences: () => void;
}

export default function CookieConsentBanner({
  onAcceptAll,
  onEssentialOnly,
  onManagePreferences,
}: CookieConsentBannerProps) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[80] p-4 sm:p-6 pointer-events-none"
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="pointer-events-auto mx-auto max-w-4xl rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl shadow-black/10 dark:shadow-black/40">
        <div className="p-4 sm:p-6">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Cookie management
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
            We use cookies and similar technologies for security, preferences, and
            (optionally) analytics. You can accept all, allow only essential cookies,
            or choose categories. See our{" "}
            <Link
              href="/legal/cookie_policy"
              className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
            >
              Cookie Policy
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
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors"
            >
              Accept all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
