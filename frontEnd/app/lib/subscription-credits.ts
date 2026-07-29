/**
 * Coach event-credit helpers (membership Phase 2+).
 * Returns:
 * - true  → has credits
 * - false → coach with 0 credits
 * - null  → not a coach / credits unknown (let API decide)
 */
export function coachHasEventCredits(user: unknown): boolean | null {
  if (!user || typeof user !== "object") return null;
  const coach = (user as { coach?: unknown }).coach;
  if (!coach) return null;
  if (typeof coach !== "object") return null;
  const credits = Number((coach as { eventCredits?: unknown }).eventCredits);
  if (Number.isNaN(credits)) return null;
  return credits > 0;
}

export const NO_EVENT_CREDITS_EVENT = "eventsport:no-event-credits";

/** Opens the in-app no-credits modal (see NoEventCreditsGate). */
export function notifyNoEventCreditsAndGoUpgrade(_router?: {
  push: (href: string) => void;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NO_EVENT_CREDITS_EVENT));
}
