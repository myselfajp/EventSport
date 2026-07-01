"use client";

import React from "react";
import { EP } from "@/app/lib/endpoints";
import { fullName, MessageUser } from "@/app/lib/messages-api";

interface AvatarProps {
  user: MessageUser | null;
  size?: number;
}

function initials(user: MessageUser | null): string {
  if (!user) return "?";
  const f = (user.firstName ?? "").trim();
  const l = (user.lastName ?? "").trim();
  const a = f ? f[0] : "";
  const b = l ? l[0] : "";
  return (a + b).toUpperCase() || "?";
}

const Avatar: React.FC<AvatarProps> = ({ user, size = 40 }) => {
  const path = user?.photo?.path;
  const dimension = { width: size, height: size };

  if (path) {
    return (
      <img
        src={EP.assetUrl(path)}
        alt={fullName(user)}
        style={dimension}
        className="rounded-full object-cover flex-shrink-0 bg-slate-200 dark:bg-slate-700"
      />
    );
  }

  return (
    <div
      style={dimension}
      className="rounded-full flex-shrink-0 flex items-center justify-center bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-semibold"
    >
      {initials(user)}
    </div>
  );
};

export default Avatar;
