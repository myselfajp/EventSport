"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";

export type ProviderRoleSwitchDirection = "to-coach" | "to-performance";

type Props = {
  direction: ProviderRoleSwitchDirection;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

const COPY: Record<
  ProviderRoleSwitchDirection,
  { title: string; body: string; checkbox: string }
> = {
  "to-performance": {
    title: "Switching to Performance Team",
    body: "If you continue, your coach profile and sport branches will be removed. Your previous service request offers, incoming Coach Me requests, and any related direct messages will also be permanently deleted.",
    checkbox:
      "I understand and agree. My coach profile, service request data, and related messages will be deleted.",
  },
  "to-coach": {
    title: "Switching to Coach",
    body: "If you continue, your Performance Team profile will be removed. Your previous service request offers, incoming Performance Team requests, and any related direct messages will also be permanently deleted.",
    checkbox:
      "I understand and agree. My Performance Team profile, service request data, and related messages will be deleted.",
  },
};

export default function ProviderRoleSwitchConsent({
  direction,
  checked,
  onChange,
}: Props) {
  const copy = COPY[direction];

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="mb-3 flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {copy.title}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-amber-800 dark:text-amber-200">
            {copy.body}
          </p>
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm text-amber-900 dark:text-amber-100">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
        />
        <span>{copy.checkbox}</span>
      </label>
    </div>
  );
}
