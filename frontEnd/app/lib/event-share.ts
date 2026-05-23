export type EventSharePayload = {
  eventId: string;
  eventName: string;
  inviterName: string;
  groupName?: string;
};

/** Public invite URL (Faz 1 landing). */
export function getEventInviteUrl(eventId: string): string {
  const base =
    (typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : "") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${String(base).replace(/\/$/, "")}/invite/event/${eventId}`;
}

export function buildEventShareMessage(payload: EventSharePayload): string {
  const { inviterName, eventName, groupName } = payload;
  const url = getEventInviteUrl(payload.eventId);

  if (groupName?.trim()) {
    return (
      `${inviterName} invited you to join the training group "${groupName}" on EventSport.\n` +
      `Event: ${eventName}\n` +
      `Download the app and join now: ${url}`
    );
  }

  return (
    `${inviterName} invited you to "${eventName}" on EventSport.\n` +
    `Join here: ${url}`
  );
}

export function whatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function telegramShareUrlFromText(text: string): string {
  const lines = text.split("\n");
  const url = lines[lines.length - 1] || "";
  const body = lines.slice(0, -1).join("\n").trim() || text;
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(body)}`;
}

export function twitterShareUrl(text: string): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function facebookShareUrl(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function emailShareUrl(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export async function nativeShare(payload: EventSharePayload): Promise<boolean> {
  if (!canUseNativeShare()) return false;
  const text = buildEventShareMessage(payload);
  const url = getEventInviteUrl(payload.eventId);
  try {
    await navigator.share({
      title: payload.eventName,
      text,
      url,
    });
    return true;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return true;
    return false;
  }
}
