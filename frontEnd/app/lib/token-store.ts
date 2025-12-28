"use client";

const TOKEN_KEY = "se_at";

function getInitialToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
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
  } catch {
  }
}

export const tokenStore = {
  set(t: string | null) {
    memToken = t || null;
    saveToStorage(t);
  },
  get(): string | null {
    if (memToken) return memToken;
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        memToken = stored;
      }
      return stored;
    } catch {
      return null;
    }
  },
  clear() {
    memToken = null;
    saveToStorage(null);
  },
};

