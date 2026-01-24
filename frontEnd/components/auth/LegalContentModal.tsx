"use client";

import React from "react";

interface LegalContentModalProps {
  title: string;
  content: string;
  onClose: () => void;
}

export default function LegalContentModal({
  title,
  content,
  onClose,
}: LegalContentModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 text-2xl leading-none"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-sm text-gray-700 dark:text-slate-300 whitespace-pre-wrap">
            {content || "(No content)"}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
