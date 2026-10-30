"use client";

import { useEffect, useState } from "react";
import {
  COOKIE_CATEGORY_META,
  type CookieConsentPreferences,
} from "@/app/lib/cookie-consent";

const OPTIONAL_CATEGORIES: (keyof CookieConsentPreferences)[] = [
  "functional",
  "analytics",
  "marketing",
];

export default function CookiePreferencesPanel({
  initialPreferences,
  onSave,
  onAcceptAll,
  onCancel,
  showCancel = false,
}: {
  initialPreferences: CookieConsentPreferences;
  onSave: (preferences: CookieConsentPreferences) => void;
  onAcceptAll: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
}) {
  const [draft, setDraft] = useState<CookieConsentPreferences>(initialPreferences);

  useEffect(() => {
    setDraft(initialPreferences);
  }, [initialPreferences]);

  const toggle = (key: keyof CookieConsentPreferences) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-gray-900 dark:text-white">
              {COOKIE_CATEGORY_META.essential.label}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              {COOKIE_CATEGORY_META.essential.description}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-500">
            Always on
          </span>
        </div>
      </div>

      {OPTIONAL_CATEGORIES.map((key) => {
        const meta = COOKIE_CATEGORY_META[key];
        return (
          <label
            key={key}
            className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-900/40 transition-colors"
          >
            <input
              type="checkbox"
              checked={draft[key]}
              onChange={() => toggle(key)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="min-w-0">
              <span className="block font-medium text-gray-900 dark:text-white">
                {meta.label}
              </span>
              <span className="block mt-1 text-sm text-gray-600 dark:text-slate-400">
                {meta.description}
              </span>
            </span>
          </label>
        );
      })}

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
        {showCancel && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => onSave(draft)}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors shadow-sm"
        >
          Save preferences
        </button>
        <button
          type="button"
          onClick={onAcceptAll}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-lg hover:bg-cyan-100 dark:hover:bg-cyan-950/60 transition-colors"
        >
          Accept all
        </button>
      </div>
    </div>
  );
}
