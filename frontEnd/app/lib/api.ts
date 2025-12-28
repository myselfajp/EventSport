"use client";

import { tokenStore } from "./token-store";

export function extractTokenFromResponse(res: Response) {
  const h = res.headers.get("Authorization");
  if (!h) {
    return null;
  }
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  const token = m?.[1] || null;
  return token;
}


export function getCSRFToken(): string | null {
  if (typeof document === "undefined") return null;
  try {
    const cookies = document.cookie.split(";");
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      const equalIndex = trimmed.indexOf("=");
      if (equalIndex === -1) continue;
      const name = trimmed.substring(0, equalIndex);
      const value = trimmed.substring(equalIndex + 1);
      if (name === "csrf-token") {
        return decodeURIComponent(value);
      }
    }
  } catch (e) {
    console.error("Error reading CSRF token:", e);
  }
  return null;
}

export async function apiFetch(
  url: string,
  options: RequestInit = {},
  {
    skipAuth = false,
    withCredentials = true,
  }: { skipAuth?: boolean; withCredentials?: boolean } = {}
) {
  const headers = new Headers(options.headers || {});
  const sendAuth = !skipAuth;
  const isFormData = options.body instanceof FormData;

  // Don't set Content-Type for FormData, browser will set it with boundary
  if (isFormData && headers.has("Content-Type")) {
    headers.delete("Content-Type");
  }

  if (sendAuth) {
    const t = tokenStore.get();
    if (t) {
      headers.set("Authorization", `Bearer ${t}`);
    }
  }

  const needsCSRF = options.method === "POST" || options.method === "PUT" || options.method === "DELETE" || options.method === "PATCH";
  
  if (needsCSRF) {
    const csrfToken = getCSRFToken();
    if (csrfToken) {
      headers.set("x-csrf-token", csrfToken);
    }
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: withCredentials ? "include" : "omit",
  });

  const rotated = extractTokenFromResponse(res);
  if (rotated) {
    tokenStore.set(rotated);
  }

  if (res.status === 401 && sendAuth) {
    tokenStore.clear();
  }

  return res;
}

export async function fetchJSON(
  url: string,
  {
    method = "GET",
    body,
    headers = {},
    ...rest
  }: { method?: string; body?: any; headers?: Record<string, string> } = {},
  opts?: { skipAuth?: boolean; withCredentials?: boolean }
) {
  const h = new Headers(headers);
  h.set("Accept", "application/json");
  if (method !== "GET" && method !== "HEAD") {
    h.set("Content-Type", "application/json; charset=UTF-8");
  }

  const res = await apiFetch(
    url,
    {
      method,
      headers: h,
      body: body ? JSON.stringify(body) : undefined,
      ...rest,
    },
    opts
  );

  const txt = await res.text();
  let json: any = {};
  try {
    json = txt ? JSON.parse(txt) : {};
  } catch {
  }
  return json;
}
