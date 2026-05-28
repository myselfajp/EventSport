"use client";

import React, { useState } from "react";
import { X, Users, Loader2, ChevronLeft, ChevronRight, UserCircle2 } from "lucide-react";
import { useCoachFollowers } from "@/app/hooks/useFollows";
import { EP } from "@/app/lib/endpoints";
import UserProfileModal from "@/components/UserProfileModal";

interface CoachFollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachId: string | null;
  coachName?: string;
}

const PAGE_SIZE = 20;

const formatFollowedAt = (iso?: string) => {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
};

const CoachFollowersModal: React.FC<CoachFollowersModalProps> = ({
  isOpen,
  onClose,
  coachId,
  coachName,
}) => {
  const [page, setPage] = useState(1);
  const [openedUserId, setOpenedUserId] = useState<string | null>(null);

  const { data, isLoading, isFetching, error } = useCoachFollowers(
    coachId,
    page,
    PAGE_SIZE,
    { enabled: isOpen }
  );

  if (!isOpen) return null;

  const followers = data?.followers ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 min-w-0">
              <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                  Followers
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">
                  {coachName ? `${coachName} · ` : ""}
                  {total} total
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-gray-50 dark:bg-gray-900">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                <p className="text-sm">Loading followers...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-sm p-4 rounded-lg text-center">
                Failed to load followers.
              </div>
            ) : followers.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm font-medium">No followers yet</p>
                <p className="text-xs mt-1">
                  Be the first one to follow this coach.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {followers.map((row) => {
                  const fullName = [row.user.firstName, row.user.lastName]
                    .filter(Boolean)
                    .join(" ")
                    .trim();
                  const initials =
                    `${row.user.firstName?.[0] ?? ""}${
                      row.user.lastName?.[0] ?? ""
                    }`.toUpperCase() || "?";
                  const photoUrl = row.user.photo?.path
                    ? EP.assetUrl(row.user.photo.path)
                    : null;
                  return (
                    <li key={row._id}>
                      <button
                        type="button"
                        onClick={() => setOpenedUserId(row.user._id)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-sm transition-all text-left"
                      >
                        <div className="w-11 h-11 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-semibold flex items-center justify-center overflow-hidden shrink-0">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={fullName || "User"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm">{initials}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {fullName || "Member"}
                          </p>
                          {row.followedAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Following since {formatFollowedAt(row.followedAt)}
                            </p>
                          )}
                        </div>
                        <UserCircle2 className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || isFetching}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages || isFetching}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <UserProfileModal
        isOpen={!!openedUserId}
        onClose={() => setOpenedUserId(null)}
        userId={openedUserId}
      />
    </>
  );
};

export default CoachFollowersModal;
