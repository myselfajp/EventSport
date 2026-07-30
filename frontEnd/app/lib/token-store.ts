"use client";

const TOKEN_KEY = "se_at";

/**
 * Auth tokens live in sessionStorage so each browser tab keeps its own session.
 * localStorage is not used (it is shared across tabs on the same origin).
 */
function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** One-time: move a legacy shared localStorage token into this tab only. */
function migrateLegacyLocalStorageToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const legacy = localStorage.getItem(TOKEN_KEY);
    if (!legacy) return null;
    sessionStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(TOKEN_KEY);
    return legacy;
  } catch {
    return null;
  }
}

function getInitialToken(): string | null {
  return readStoredToken() ?? migrateLegacyLocalStorageToken();
}

let memToken: string | null = getInitialToken();

function saveToStorage(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
    // Never keep auth tokens in localStorage (shared across tabs).
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export const tokenStore = {
  set(t: string | null) {
    memToken = t || null;
    saveToStorage(t);
  },
  get(): string | null {
    if (memToken) return memToken;
    const stored = readStoredToken() ?? migrateLegacyLocalStorageToken();
    if (stored) {
      memToken = stored;
    }
    return stored;
  },
  clear() {
    memToken = null;
    saveToStorage(null);
  },
};
