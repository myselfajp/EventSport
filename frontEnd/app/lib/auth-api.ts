"use client";

import { EP } from "./endpoints";
import { apiFetch, tryRefreshToken, extractTokenFromResponse } from "./api";
import { tokenStore } from "./token-store";

export type User = any;

//-----------get current user
export async function getMe(): Promise<User | null> {
  const res = await apiFetch(EP.AUTH.me, { method: "GET" });
  
  const token = extractTokenFromResponse(res);
  if (token) {
    tokenStore.set(token);
  }
  
  if (res.status === 401) {
    const ok = await tryRefreshToken();
    if (!ok) return null;
    const retry = await apiFetch(EP.AUTH.me, { method: "GET" });
    
    const retryToken = extractTokenFromResponse(retry);
    if (retryToken) {
      tokenStore.set(retryToken);
    }
    
    if (!retry.ok) return null;
    const rb = await retry.json().catch(() => ({}));
    return rb?.data ?? null;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) return null;
  return body?.data ?? null;
}

export async function signIn(payload: { email: string; password: string }) {
  const res = await apiFetch(
    EP.AUTH.signIn,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
    { skipAuth: true }
  );
  
  const token = extractTokenFromResponse(res);
  if (token) {
    tokenStore.set(token);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data ?? body?.user ?? null;
}

export async function signUp(payload: Record<string, any>) {
  const res = await apiFetch(
    EP.AUTH.signUp,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    },
    { skipAuth: true }
  );
  
  const token = extractTokenFromResponse(res);
  if (token) {
    tokenStore.set(token);
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data ?? body?.user ?? null;
}

export async function editUserPhoto(formData?: FormData) {
  const res = await apiFetch(
    EP.AUTH.editUserPhoto,
    {
      method: "POST",
      body: formData,
    }
  );
  if (res.status === 204) {
    return null;
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body?.data ?? null;
}

export async function signOut() {
  try {
    await apiFetch(EP.AUTH.signOut, {
      method: "POST",
      credentials: "include",
    });
  } catch {
  } finally {
    tokenStore.clear();
  }
}
