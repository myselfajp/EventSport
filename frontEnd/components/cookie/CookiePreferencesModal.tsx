"use client";

import { useState } from "react";
import Link from "next/link";
import { X, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { type CookieConsentPreferences } from "@/app/lib/cookie-consent";
import CookiePreferencesPanel from "./CookiePreferencesPanel";

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

export default function CookiePreferencesModal({
  isOpen,
  onClose,
  initialPreferences,
  onSave,
  onAcceptAll,
  policyDoc,
}: CookiePreferencesModalProps) {
  const [showDocContent, setShowDocContent] = useState(false);

  if (!isOpen) return null;

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

          <CookiePreferencesPanel
            initialPreferences={initialPreferences}
            onSave={onSave}
            onAcceptAll={onAcceptAll}
            onCancel={onClose}
            showCancel
          />
        </div>
      </div>
    </div>
  );
}
