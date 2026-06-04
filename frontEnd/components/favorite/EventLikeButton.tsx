"use client";

import React, { useCallback, useState } from "react";
import { Heart, Loader2 } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import {
  isEventLiked,
  useAddFavorite,
  useEventLikes,
  useRemoveFavorite,
} from "@/app/hooks/useFavorites";

type EventLikeButtonProps = {
  eventId?: string | null;
  eventEntity?: Record<string, unknown>;
  className?: string;
  showLabel?: boolean;
};

const EventLikeButton: React.FC<EventLikeButtonProps> = ({
  eventId,
  eventEntity,
  className = "",
  showLabel = true,
}) => {
  const { data: user } = useMe();
  const canLike = !!user?.participant;
  const id = eventId ? String(eventId) : "";

  const { data: likesData } = useEventLikes();
  const likes = likesData?.data ?? { event: [] };
  const serverLiked = isEventLiked(likes, id);

  const [optimisticLiked, setOptimisticLiked] = useState<boolean | null>(null);
  const isLiked = optimisticLiked !== null ? optimisticLiked : serverLiked;

  const addLike = useAddFavorite();
  const removeLike = useRemoveFavorite();
  const isPending = addLike.isPending || removeLike.isPending;

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!id) return;
      if (!canLike) {
        alert("Create a gamer profile to like events.");
        return;
      }

      const next = !isLiked;
      setOptimisticLiked(next);

      try {
        if (next) {
          await addLike.mutateAsync({
            type: "event",
            id,
            entity: eventEntity,
          });
        } else {
          await removeLike.mutateAsync({ type: "event", id });
        }
      } catch {
        setOptimisticLiked(null);
      } finally {
        setOptimisticLiked(null);
      }
    },
    [addLike, canLike, eventEntity, id, isLiked, removeLike]
  );

  if (!id) return null;

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={!canLike || isPending}
      title={
        !canLike
          ? "Create a gamer profile to like events"
          : isLiked
            ? "Unlike"
            : "Like"
      }
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
        isLiked
          ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/60"
          : "bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:border-red-300 dark:hover:border-red-700 hover:text-red-600 dark:hover:text-red-400"
      } ${className}`}
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Heart
          className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`}
        />
      )}
      {showLabel && (isLiked ? "Liked" : "Like")}
    </button>
  );
};

export default EventLikeButton;
