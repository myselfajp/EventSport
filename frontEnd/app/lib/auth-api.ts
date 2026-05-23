"use client";

import { EP } from "./endpoints";
import { apiFetch, extractTokenFromResponse } from "./api";
import { tokenStore } from "./token-store";

export type User = any;

async function ensureCsrfCookie() {
  await apiFetch(EP.LEGAL.getActive("terms"), { method: "GET" }, { skipAuth: true });
}

//-----------get current user
export async function getMe(): Promise<User | null> {
  const res = await apiFetch(EP.AUTH.me, { method: "GET" });
  
  const token = extractTokenFromResponse(res);
  if (token) {
    tokenStore.set(token);
  }
  
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) return null;
  return body?.data ?? null;
}

export async function sendRegistrationOtp(payload: {
  email: string;
  firstName?: string;
}) {
  await ensureCsrfCookie();
  const res = await apiFetch(
    EP.AUTH.sendRegistrationOtp,
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
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) {
    throw new Error(
      body?.error || body?.message || "Doğrulama kodu gönderilemedi."
    );
  }
  return {
    message: body.message as string,
    emailSent: Boolean(body.emailSent),
    devOtp: body.devOtp as string | undefined,
  };
}

export async function signIn(payload: { email: string; password: string }) {
  await ensureCsrfCookie();
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
    throw new Error(
      body?.error || body?.message || `Giriş yapılamadı (HTTP ${res.status}).`
    );
  }
  return body?.data ?? body?.user ?? null;
}

export async function signUp(payload: Record<string, any>) {
  await ensureCsrfCookie();
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
    throw new Error(
      body?.error || body?.message || `Kayıt oluşturulamadı (HTTP ${res.status}).`
    );
  }
  return body?.data ?? body?.user ?? null;
}

export async function editUserPhoto(formData?: FormData) {
  const res = await apiFetch(
    EP.AUTH.editUser,
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
    throw new Error(
      body?.error || body?.message || `İşlem başarısız (HTTP ${res.status}).`
    );
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
