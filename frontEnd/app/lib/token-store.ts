"use client";

import { tryRefreshToken } from "./api";

const TOKEN_KEY = "se_at";
const TOKEN_LIFETIME_MS = 15 * 60 * 1000;
const REFRESH_BUFFER_MS = 2 * 60 * 1000;

function getInitialToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let memToken: string | null = getInitialToken();
let refreshTimer: NodeJS.Timeout | null = null;

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

function startAutoRefresh() {
  if (typeof window === "undefined" || refreshTimer) return;

  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(async () => {
    if (memToken) {
      await tryRefreshToken();
    }
  }, TOKEN_LIFETIME_MS - REFRESH_BUFFER_MS);
}

function stopAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

export const tokenStore = {
  set(t: string | null) {
    memToken = t || null;
    saveToStorage(t);

    if (memToken) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  },
  get(): string | null {
    if (memToken) return memToken;
    if (typeof window === "undefined") return null;
    try {
      const stored = sessionStorage.getItem(TOKEN_KEY);
      if (stored) {
        memToken = stored;
        startAutoRefresh();
      }
      return stored;
    } catch {
      return null;
    }
  },
  clear() {
    memToken = null;
    saveToStorage(null);
    stopAutoRefresh();
  },
};

if (typeof window !== "undefined" && memToken) {
  startAutoRefresh();
}

