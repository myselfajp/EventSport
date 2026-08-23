/**
 * Provider (coach or Performance Team) subscription helpers.
 */

export type ProviderSubscription = {
  subscriptionTier?: string;
  eventCredits?: number;
  replyCredits?: number;
};

export function getProviderSubscription(user: unknown): ProviderSubscription | null {
  if (!user || typeof user !== "object") return null;
  const record = user as { coach?: unknown; performanceMember?: unknown };

  if (record.coach && typeof record.coach === "object") {
    return record.coach as ProviderSubscription;
  }
  if (record.performanceMember && typeof record.performanceMember === "object") {
    return record.performanceMember as ProviderSubscription;
  }
  return null;
}

export function isEventHost(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const record = user as { role?: number; coach?: unknown; performanceMember?: unknown };
  return record.role === 0 || !!record.coach || !!record.performanceMember;
}

export function isUpgradeEligibleProvider(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const record = user as { coach?: unknown; performanceMember?: unknown };
  return !!record.coach || !!record.performanceMember;
}

/**
 * Returns:
 * - true  → has credits
 * - false → provider with 0 credits
 * - null  → not a provider / credits unknown (let API decide)
 */
export function providerHasEventCredits(user: unknown): boolean | null {
  const subscription = getProviderSubscription(user);
  if (!subscription) return null;
  const credits = Number(subscription.eventCredits);
  if (Number.isNaN(credits)) return null;
  return credits > 0;
}

/** @deprecated Use providerHasEventCredits */
export function coachHasEventCredits(user: unknown): boolean | null {
  return providerHasEventCredits(user);
}

export const NO_EVENT_CREDITS_EVENT = "eventsport:no-event-credits";

/** Opens the in-app no-credits modal (see NoEventCreditsGate). */
export function notifyNoEventCreditsAndGoUpgrade(_router?: {
  push: (href: string) => void;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(NO_EVENT_CREDITS_EVENT));
}
