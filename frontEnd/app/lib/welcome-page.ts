export const WELCOME_PAGE_SEEN_KEY = "eventsport-welcome-seen";

export function hasSeenWelcomePage(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(WELCOME_PAGE_SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

export function markWelcomePageSeen(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WELCOME_PAGE_SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export type WelcomeSocialPlatform =
  | "instagram"
  | "twitter"
  | "linkedin"
  | "youtube"
  | "telegram"
  | "facebook";

export type WelcomePagePublicData = {
  headline: string;
  subheadline: string;
  emailPrompt: string;
  ctaSubmitLabel: string;
  ctaSkipLabel: string;
  image?: { path?: string; mimeType?: string };
  imageAlt?: string;
  socialLinks?: Array<{ platform: WelcomeSocialPlatform; url: string }>;
};

export const WELCOME_SOCIAL_PLATFORMS: WelcomeSocialPlatform[] = [
  "instagram",
  "twitter",
  "linkedin",
  "youtube",
  "telegram",
  "facebook",
];

export const WELCOME_SOCIAL_LABELS: Record<WelcomeSocialPlatform, string> = {
  instagram: "Instagram",
  twitter: "X (Twitter)",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  telegram: "Telegram",
  facebook: "Facebook",
};
