"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import {
  APP_TOAST_EVENT,
  type AppToastPayload,
  type AppToastType,
} from "@/app/lib/app-toast";

type ToastItem = {
  id: number;
  type: AppToastType;
  message: string;
};

const ICONS: Record<AppToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES: Record<AppToastType, string> = {
  success:
    "border-emerald-200 dark:border-emerald-800 bg-white dark:bg-slate-900 text-emerald-800 dark:text-emerald-200",
  error:
    "border-red-200 dark:border-red-800 bg-white dark:bg-slate-900 text-red-700 dark:text-red-300",
  info:
    "border-cyan-200 dark:border-cyan-800 bg-white dark:bg-slate-900 text-cyan-800 dark:text-cyan-200",
};

const ICON_STYLES: Record<AppToastType, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-500 dark:text-red-400",
  info: "text-cyan-600 dark:text-cyan-400",
};

export default function AppToastGate() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<AppToastPayload>).detail;
      if (!detail?.message?.trim()) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      const type = detail.type || "info";
      const durationMs = detail.durationMs ?? 4200;
      setToasts((prev) => [...prev.slice(-3), { id, type, message: detail.message.trim() }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, durationMs);
    };

    window.addEventListener(APP_TOAST_EVENT, handler);
    return () => window.removeEventListener(APP_TOAST_EVENT, handler);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((toast) => {
        const Icon = ICONS[toast.type];
        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg ${STYLES[toast.type]}`}
            role="status"
          >
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${ICON_STYLES[toast.type]}`} />
            <p className="flex-1 text-sm font-medium leading-relaxed text-gray-800 dark:text-slate-100">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
