export type BlogSharePayload = {
  slug: string;
  title: string;
  authorName: string;
};

export function getBlogShareUrl(slug: string): string {
  const base =
    (typeof window !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : "") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${String(base).replace(/\/$/, "")}/blogs/${encodeURIComponent(slug)}`;
}

export function buildBlogShareMessage(payload: BlogSharePayload): string {
  const url = getBlogShareUrl(payload.slug);
  return (
    `Read "${payload.title}" by ${payload.authorName} on EventSport.\n` +
    `${url}`
  );
}

export {
  whatsAppShareUrl,
  telegramShareUrlFromText,
  twitterShareUrl,
  facebookShareUrl,
  emailShareUrl,
  copyTextToClipboard,
  canUseNativeShare,
} from "@/app/lib/event-share";

export async function nativeShareBlog(payload: BlogSharePayload): Promise<boolean> {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") {
    return false;
  }
  const text = buildBlogShareMessage(payload);
  const url = getBlogShareUrl(payload.slug);
  try {
    await navigator.share({
      title: payload.title,
      text,
      url,
    });
    return true;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return true;
    return false;
  }
}
