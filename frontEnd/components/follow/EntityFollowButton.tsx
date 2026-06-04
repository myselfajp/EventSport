"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import {
  FollowType,
  isEntityFollowedInList,
  useCoachFollowStats,
  useFollowMutation,
  useFollows,
  useUnfollowMutation,
} from "@/app/hooks/useFollows";

type EntityFollowButtonProps = {
  type: FollowType;
  entityId?: string | null;
  className?: string;
  /** Hide when viewer cannot follow (e.g. own profile). */
  hidden?: boolean;
};

const EntityFollowButton: React.FC<EntityFollowButtonProps> = ({
  type,
  entityId,
  className = "",
  hidden = false,
}) => {
  const { data: user } = useMe();
  const canFollow = !!user?.participant;
  const id = entityId ? String(entityId) : "";

  const { data: followsData } = useFollows();
  const { data: coachStats } = useCoachFollowStats(
    type === "coach" && id ? id : null
  );

  const listFollowing = useMemo(
    () => isEntityFollowedInList(followsData?.grouped, type, id),
    [followsData?.grouped, type, id]
  );

  const serverFollowing =
    type === "coach" && coachStats !== undefined
      ? coachStats.isFollowing
      : listFollowing;

  const [optimisticFollowing, setOptimisticFollowing] = useState<
    boolean | null
  >(null);

  const isFollowing =
    optimisticFollowing !== null ? optimisticFollowing : serverFollowing;

  const followMutation = useFollowMutation();
  const unfollowMutation = useUnfollowMutation();
  const isPending =
    followMutation.isPending || unfollowMutation.isPending;

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!id) return;
      if (!canFollow) {
        alert("Create a gamer profile to follow.");
        return;
      }

      const next = !isFollowing;
      setOptimisticFollowing(next);

      try {
        if (next) {
          await followMutation.mutateAsync({ type, id });
        } else {
          await unfollowMutation.mutateAsync({ type, id });
        }
      } catch {
        setOptimisticFollowing(null);
      } finally {
        setOptimisticFollowing(null);
      }
    },
    [canFollow, followMutation, id, isFollowing, type, unfollowMutation]
  );

  if (hidden || !id) return null;

  if (!canFollow) {
    return (
      <button
        type="button"
        disabled
        title="Create a gamer profile to follow"
        className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-70 ${className}`}
      >
        <UserPlus className="w-4 h-4" />
        Follow
      </button>
    );
  }

  if (isFollowing) {
    return (
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={`inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 border border-gray-200 dark:border-gray-600 hover:border-red-300 dark:hover:border-red-700 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed group ${className}`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <UserCheck className="w-4 h-4 group-hover:hidden" />
            <span className="hidden group-hover:inline">Unfollow</span>
            <span className="group-hover:hidden">Following</span>
          </>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 px-4 py-2.5 bg-cyan-50 dark:bg-cyan-900/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <UserPlus className="w-4 h-4" />
      )}
      Follow
    </button>
  );
};

export default EntityFollowButton;
