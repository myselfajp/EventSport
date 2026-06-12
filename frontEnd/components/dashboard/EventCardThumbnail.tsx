"use client";

import { ImageIcon } from "lucide-react";
import { EP } from "@/app/lib/endpoints";

type EventImageRef = { path?: string } | null | undefined;

type Props = {
  photo?: EventImageRef;
  banner?: EventImageRef;
  alt?: string;
  className?: string;
};

function getEventImageUrl(
  photo?: EventImageRef,
  banner?: EventImageRef
): string | null {
  if (photo?.path) return EP.assetUrl(photo.path);
  if (banner?.path) return EP.assetUrl(banner.path);
  return null;
}

export default function EventCardThumbnail({
  photo,
  banner,
  alt = "Event",
  className = "",
}: Props) {
  const url = getEventImageUrl(photo, banner);

  return (
    <div
      className={`shrink-0 w-[72px] h-[72px] rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 border border-gray-200/80 dark:border-slate-600/80 ${className}`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-gray-400 dark:text-slate-500" />
        </div>
      )}
    </div>
  );
}
