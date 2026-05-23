"use client";

import { AlertCircle, User } from "lucide-react";
import { useGamerProfilePrompt } from "@/app/contexts/GamerProfilePromptContext";

type GamerProfileRequiredBannerProps = {
  compact?: boolean;
  className?: string;
};

export default function GamerProfileRequiredBanner({
  compact = false,
  className = "",
}: GamerProfileRequiredBannerProps) {
  const { openGamerProfile } = useGamerProfilePrompt();

  if (compact) {
    return (
      <div
        className={`flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs text-amber-900 dark:text-amber-200 ${className}`}
      >
        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <p>
          To join events, create your{" "}
          <button
            type="button"
            onClick={openGamerProfile}
            className="font-semibold underline text-cyan-700 dark:text-cyan-400 hover:text-cyan-800"
          >
            Gamer profile
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/30 p-4 ${className}`}
    >
      <div className="flex gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Gamer profile required
          </h3>
          <p className="text-sm text-amber-800/90 dark:text-amber-200/90 mt-1">
            To join events, create and save your Gamer profile from the left panel.
          </p>
          <button
            type="button"
            onClick={openGamerProfile}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            Create Gamer profile
          </button>
        </div>
      </div>
    </div>
  );
}
