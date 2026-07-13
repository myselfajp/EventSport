export type VideoType = "educational" | "normal";

export const VIDEO_TYPE_OPTIONS: Array<{
  id: VideoType;
  label: string;
}> = [
  {
    id: "educational",
    label: "Educational Videos",
  },
  {
    id: "normal",
    label: "General Videos",
  },
];

export function videoTypeLabel(type: VideoType) {
  return VIDEO_TYPE_OPTIONS.find((option) => option.id === type)?.label || type;
}

export function youtubeEmbedUrl(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.replace(/^\//, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const watchId = parsed.searchParams.get("v");
      if (watchId) return `https://www.youtube.com/embed/${watchId}`;

      const parts = parsed.pathname.split("/").filter(Boolean);
      const embedIndex = parts.indexOf("embed");
      if (embedIndex >= 0 && parts[embedIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[embedIndex + 1]}`;
      }
      const shortsIndex = parts.indexOf("shorts");
      if (shortsIndex >= 0 && parts[shortsIndex + 1]) {
        return `https://www.youtube.com/embed/${parts[shortsIndex + 1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url);
}
