"use client";

import { ArrowUpCircle, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
};

export default function NoEventCreditsModal({ isOpen, onClose, onUpgrade }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="no-event-credits-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-950/50">
              <ArrowUpCircle className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <h2
                id="no-event-credits-title"
                className="text-lg font-semibold text-gray-900 dark:text-white"
              >
                No event credits left
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
                Your plan has no remaining event credits. Upgrade your membership to create
                new events.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-4 bg-gray-50 dark:bg-slate-800/60 border-t border-gray-100 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-700 transition-colors"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <ArrowUpCircle className="h-4 w-4" />
            Go to Upgrade
          </button>
        </div>
      </div>
    </div>
  );
}
