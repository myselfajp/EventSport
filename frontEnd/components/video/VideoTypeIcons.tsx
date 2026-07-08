import React from "react";
import type { VideoType } from "@/app/lib/video-utils";

type IconProps = {
  className?: string;
};

export function EducationalVideoIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M20 7L7 14v2.2l13 6.5 13-6.5V14L20 7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M13 17.5v5.2c0 3.8 3.1 6.8 7 6.8s7-3 7-6.8v-5.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M20 24v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="28" r="7" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.75" />
      <path d="M27.5 28l5.5 3.2V24.8L27.5 28z" fill="currentColor" />
    </svg>
  );
}

export function NormalVideoIcon({ className = "w-10 h-10" }: IconProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect
        x="6"
        y="12"
        width="20"
        height="16"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M26 16.5l8-4.5v15.5l-8-4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="20" r="4.5" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="20" r="1.5" fill="currentColor" />
    </svg>
  );
}

export function VideoTypeIcon({
  type,
  className = "w-10 h-10",
}: {
  type: VideoType;
  className?: string;
}) {
  if (type === "educational") {
    return <EducationalVideoIcon className={className} />;
  }
  return <NormalVideoIcon className={className} />;
}
