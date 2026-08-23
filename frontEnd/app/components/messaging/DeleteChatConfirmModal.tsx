"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  otherUserName?: string;
  isLoading?: boolean;
  error?: string;
};

export default function DeleteChatConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  otherUserName,
  isLoading = false,
  error = "",
}: Props) {
  if (!isOpen) return null;

  const otherPartyLabel = otherUserName?.trim() || "The other person";

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm es-animate-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-chat-title"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 es-animate-dialog dark:bg-slate-800 dark:ring-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3
                id="delete-chat-title"
                className="text-base font-semibold text-gray-900 dark:text-white"
              >
                Delete chat for you?
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                This only removes the conversation from your inbox.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50 dark:hover:bg-slate-700 dark:hover:text-gray-200"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-600 dark:text-slate-300">
            <span className="font-medium text-gray-900 dark:text-white">
              {otherPartyLabel}
            </span>{" "}
            will still see this chat and all messages. You can start a new conversation
            with them anytime.
          </p>
          {error ? (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-slate-700 dark:bg-slate-900/40">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Deleting…
              </>
            ) : (
              "Delete chat"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
