export type ServiceRequestTab = "mine" | "incoming";

export function readServiceRequestsTabFromUrl(): ServiceRequestTab | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get("coachMe") === "1") return "mine";
  const value = params.get("serviceRequests");
  if (!value) return null;
  return value === "incoming" ? "incoming" : "mine";
}

export function readLoginFromUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("login") === "1";
}

export function readServiceRequestFocusFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("requestId") || null;
}

function clearUrlParams(...keys: string[]) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of keys) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (!changed) return;
  const qs = url.searchParams.toString();
  window.history.replaceState(null, "", `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`);
}

/** Remove `serviceRequests` / `coachMe` / `requestId` from the address bar so refresh does not reopen the panel. */
export function clearServiceRequestsUrlParam() {
  clearUrlParams("serviceRequests", "coachMe", "requestId");
}

export function clearLoginUrlParam() {
  clearUrlParams("login");
}
