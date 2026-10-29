"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import {
  COOKIE_CATEGORY_META,
  type CookieConsentPreferences,
} from "@/app/lib/cookie-consent";

interface CookiePreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreferences: CookieConsentPreferences;
  onSave: (preferences: CookieConsentPreferences) => void;
  onAcceptAll: () => void;
  policyDoc?: {
    title: string;
    content: string;
  } | null;
}

const OPTIONAL_CATEGORIES: (keyof CookieConsentPreferences)[] = [
  "functional",
  "analytics",
  "marketing",
];

export default function CookiePreferencesModal({
  isOpen,
  onClose,
  initialPreferences,
  onSave,
  onAcceptAll,
  policyDoc,
}: CookiePreferencesModalProps) {
  const [draft, setDraft] = useState<CookieConsentPreferences>(initialPreferences);
  const [showDocContent, setShowDocContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDraft(initialPreferences);
    }
  }, [isOpen, initialPreferences]);

  if (!isOpen) return null;

  const toggle = (key: keyof CookieConsentPreferences) => {
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasPolicyContent = Boolean(policyDoc?.content?.trim());
  const policyTitle = policyDoc?.title?.trim() || "Cookie Policy";

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs">
      <div
        className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-700"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-preferences-title"
      >
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-gray-200 dark:border-slate-700">
          <div>
            <h2
              id="cookie-preferences-title"
              className="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Cookie preferences
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
              Choose which cookie categories you allow. View our{" "}
              <Link
                href="/contracts#cookie-policy"
                className="text-cyan-600 dark:text-cyan-400 hover:underline font-medium"
              >
                {policyTitle}
              </Link>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 shrink-0 p-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          {/* Admin Policy Content Preview Accordion */}
          {hasPolicyContent && (
            <div className="rounded-lg border border-cyan-200 dark:border-cyan-800/60 bg-cyan-50/50 dark:bg-cyan-950/20 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDocContent(!showDocContent)}
                className="w-full flex items-center justify-between p-3.5 text-left text-sm font-medium text-cyan-900 dark:text-cyan-200 hover:bg-cyan-100/50 dark:hover:bg-cyan-950/40 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                  <span>{policyTitle} (Policy Details)</span>
                </span>
                {showDocContent ? (
                  <ChevronUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                )}
              </button>

              {showDocContent && (
                <div className="p-4 border-t border-cyan-200 dark:border-cyan-800/60 max-h-56 overflow-y-auto bg-white/70 dark:bg-slate-900/70 text-xs sm:text-sm text-gray-700 dark:text-slate-300 contracts-prose [&_a]:text-cyan-600 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: policyDoc?.content || "",
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Essential category (required) */}
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

          {/* Optional categories */}
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
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
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
    </div>
  );
}
