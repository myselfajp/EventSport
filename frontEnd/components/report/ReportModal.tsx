"use client";

import React, { useState } from "react";
import { X, Flag, Loader2 } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export type ReportTargetType =
  | "user"
  | "coach"
  | "event"
  | "facility"
  | "company"
  | "club"
  | "community";

const REASON_OPTIONS: Array<{ value: string; label: string; forEventOnly?: boolean }> = [
  { value: "impersonation", label: "Someone is impersonating me / using my identity" },
  { value: "fake_profile", label: "Fake or misleading profile" },
  { value: "misleading_event", label: "Misleading or fraudulent event", forEventOnly: true },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "other", label: "Other" },
];

type ReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
};

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetLabel,
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const reasonOptions = REASON_OPTIONS.filter(
    (opt) => !opt.forEventOnly || targetType === "event"
  );

  const handleClose = () => {
    if (submitting) return;
    onClose();
    setTimeout(() => {
      setReason("");
      setDetails("");
      setError("");
      setSuccess(false);
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        targetType,
        targetId,
      };
      if (reason) body.reason = reason;
      const trimmed = details.trim();
      if (trimmed) body.details = trimmed;

      const res = await fetchJSON(EP.REPORT.submit, { method: "POST", body });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Failed to submit report");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const typeLabels: Record<ReportTargetType, string> = {
    user: "user",
    coach: "coach",
    event: "event",
    facility: "facility",
    company: "company",
    club: "club",
    community: "community",
  };
  const typeLabel = typeLabels[targetType];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Report {typeLabel}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={submitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="p-5 space-y-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Thank you. Your report was submitted and will be reviewed by our team.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {targetLabel ? (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reporting: <span className="font-medium text-gray-800 dark:text-gray-200">{targetLabel}</span>
              </p>
            ) : null}

            {error ? (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </div>
            ) : null}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                disabled={submitting}
              >
                <option value="">Select a reason (optional)</option>
                {reasonOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Details <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Add any details that help us review this report…"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                disabled={submitting}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit report"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
