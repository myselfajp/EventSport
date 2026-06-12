export const COOKIE_CONSENT_STORAGE_KEY = "sport-events-cookie-consent";
export const COOKIE_VISITOR_STORAGE_KEY = "sport-events-cookie-visitor";
export const COOKIE_CONSENT_VERSION = 1;
export type CookieCategory = "essential" | "functional" | "analytics" | "marketing";

export type CookieConsentState = {
  version: number;
  essential: true;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  consentedAt: string;
};

export type CookieConsentPreferences = Pick<
  CookieConsentState,
  "functional" | "analytics" | "marketing"
>;

export const COOKIE_CATEGORY_META: Record<
  CookieCategory,
  { label: string; description: string; required: boolean }
> = {
  essential: {
    label: "Essential cookies",
    description:
      "Required for security (CSRF), sign-in, and core site features. Always active.",
    required: true,
  },
  functional: {
    label: "Functional cookies",
    description:
      "Remember preferences such as theme (light/dark mode) and UI settings.",
    required: false,
  },
  analytics: {
    label: "Analytics cookies",
    description:
      "Help us understand how the site is used (e.g. page views). Not used yet.",
    required: false,
  },
  marketing: {
    label: "Marketing cookies",
    description:
      "Used for advertising and remarketing on third-party platforms. Not used yet.",
    required: false,
  },
};

export const ESSENTIAL_ONLY_CONSENT: CookieConsentPreferences = {
  functional: false,
  analytics: false,
  marketing: false,
};

export const ACCEPT_ALL_CONSENT: CookieConsentPreferences = {
  functional: true,
  analytics: true,
  marketing: true,
};

export function buildConsentState(
  preferences: CookieConsentPreferences
): CookieConsentState {
  return {
    version: COOKIE_CONSENT_VERSION,
    essential: true,
    ...preferences,
    consentedAt: new Date().toISOString(),
  };
}

export function readStoredConsent(): CookieConsentState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentState;
    if (parsed?.version !== COOKIE_CONSENT_VERSION) return null;
    if (parsed.essential !== true) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredConsent(state: CookieConsentState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function isCategoryAllowed(
  category: CookieCategory,
  consent: CookieConsentState | null = readStoredConsent()
): boolean {
  if (category === "essential") return true;
  if (!consent) return false;
  return Boolean(consent[category]);
}

export function applyConsentSideEffects(consent: CookieConsentState): void {
  if (typeof window === "undefined") return;

  if (!consent.functional) {
    try {
      localStorage.removeItem("sport-events-theme");
    } catch {
      /* ignore */
    }
  }

  window.dispatchEvent(
    new CustomEvent("cookie-consent-updated", { detail: consent })
  );
}

function createVisitorKey(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `v_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getOrCreateVisitorKey(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = localStorage.getItem(COOKIE_VISITOR_STORAGE_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = createVisitorKey();
    localStorage.setItem(COOKIE_VISITOR_STORAGE_KEY, next);
    return next;
  } catch {
    return createVisitorKey();
  }
}

export async function syncCookieConsentAcceptance(
  consent: CookieConsentState
): Promise<void> {
  if (typeof window === "undefined") return;

  const { apiFetch } = await import("@/app/lib/api");
  const { EP } = await import("@/app/lib/endpoints");

  try {
    await apiFetch(EP.AUTH.cookieConsent, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        functional: consent.functional,
        analytics: consent.analytics,
        marketing: consent.marketing,
        visitorKey: getOrCreateVisitorKey(),
        consentedAt: consent.consentedAt,
      }),
    });
  } catch {
    /* audit log is best-effort; local consent still applies */
  }
}