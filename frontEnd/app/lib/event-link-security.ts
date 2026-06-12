const BLOCKED_PROTOCOL_PATTERN = /^(javascript|data|file|vbscript|blob):/i;

export type SecureEventLinkResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

/** Validates and normalizes an optional event link (HTTPS only). */
export function parseSecureEventLink(raw: string): SecureEventLinkResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) {
    return { ok: true, url: "" };
  }

  if (BLOCKED_PROTOCOL_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "This link type is not allowed. Use a secure https:// URL.",
    };
  }

  if (/^http:\/\//i.test(trimmed)) {
    return {
      ok: false,
      error:
        "Event links must use HTTPS. Replace http:// with https:// or use a secure URL.",
    };
  }

  let candidate = trimmed;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { ok: false, error: "Enter a valid URL (https://example.com)." };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Event links must use HTTPS only." };
  }

  if (!parsed.hostname) {
    return { ok: false, error: "Enter a valid URL with a domain name." };
  }

  const url = parsed.href;
  if (url.length > 500) {
    return { ok: false, error: "Event link must be at most 500 characters." };
  }

  return { ok: true, url };
}

/** Non-blocking hint while the user is typing. */
export function getEventLinkSecurityHint(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (BLOCKED_PROTOCOL_PATTERN.test(trimmed)) {
    return "Unsafe link type. Only https:// URLs are allowed.";
  }
  if (/^http:\/\//i.test(trimmed)) {
    return "This link is not secure (HTTP). Use https:// instead.";
  }
  return null;
}
