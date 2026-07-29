export type AppToastType = "success" | "error" | "info";

export type AppToastPayload = {
  type?: AppToastType;
  message: string;
  durationMs?: number;
};

export const APP_TOAST_EVENT = "eventsport:app-toast";

export function showAppToast(message: string, type: AppToastType = "info", durationMs = 4200) {
  if (typeof window === "undefined") return;
  const detail: AppToastPayload = { message, type, durationMs };
  window.dispatchEvent(new CustomEvent(APP_TOAST_EVENT, { detail }));
}
