"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Heart,
  Loader2,
  RefreshCcw,
  Check,
} from "lucide-react";
import {
  useEventLikes,
  useRemoveFavorite,
} from "@/app/hooks/useFavorites";
import { useMe } from "@/app/hooks/useAuth";
import { EP } from "@/app/lib/endpoints";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";
import ViewEventModal from "@/components/event/ViewEventModal";
import FacilityDetailsModal from "@/components/profile/FacilityDetailsModal";
import ClubViewModal, { type ClubViewModalClub } from "@/components/ClubViewModal";
import GroupViewModal, { type GroupViewModalGroup } from "@/components/GroupViewModal";
type LikedEventCard = {
  id: string;
  eventId: string;
  name: string;
  photoPath?: string;
  startTime?: string;
  sportName?: string;
  facilityName?: string;
  entity: Record<string, unknown>;
};

function toLikedEventCard(favorite: Record<string, unknown>): LikedEventCard {
  const eventId = String(
    (favorite as { event?: string; _id?: string }).event ||
      (favorite as { _id?: string })._id ||
      ""
  );
  const photo = favorite.photo as { path?: string } | string | undefined;
  const photoPath =
    typeof photo === "object" && photo?.path
      ? photo.path
      : typeof photo === "string"
        ? photo
        : (favorite.banner as { path?: string })?.path;

  const sport = favorite.sport as { name?: string } | undefined;
  const facility = favorite.facility as { name?: string } | undefined;

  return {
    id: String((favorite as { favoriteId?: string }).favoriteId || eventId),
    eventId,
    name: String(favorite.name || "Event"),
    photoPath,
    startTime:
      typeof favorite.startTime === "string" ? favorite.startTime : undefined,
    sportName: sport?.name,
    facilityName: facility?.name,
    entity: favorite,
  };
}

const formatEventDateTime = (iso?: string) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
};

const FavoritesContent: React.FC = () => {
  const { data: user } = useMe();
  const { data, isLoading, isFetching, error, refetch } = useEventLikes();
  const { mutateAsync: removeLikeAsync } = useRemoveFavorite();
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();

  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<Record<string, unknown> | null>(
    null
  );
  const [selectedFacility, setSelectedFacility] = useState<unknown>(null);
  const [selectedClub, setSelectedClub] = useState<ClubViewModalClub | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModalGroup | null>(null);

  const likedEvents = useMemo(() => {
    const list = data?.data?.event ?? [];
    return list.map((f: Record<string, unknown>) => toLikedEventCard(f));
  }, [data?.data?.event]);

  const handleUnlike = async (card: LikedEventCard) => {
    if (!card.eventId) return;
    setHiddenIds((prev) => new Set(prev).add(card.id));
    setPendingIds((prev) => new Set(prev).add(card.id));
    try {
      await removeLikeAsync({ type: "event", id: card.eventId });
      setSuccessIds((prev) => new Set(prev).add(card.id));
    } catch {
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(card.id);
        return next;
      });
      setTimeout(() => {
        setSuccessIds((prev) => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }, 900);
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Sign in to view your liked events.
        </p>
      </div>
    );
  }

  if (!user.participant) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Create a gamer profile to like events.
        </p>
      </div>
    );
  }

  const totalEmpty = likedEvents.length === 0 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-red-500 font-semibold uppercase tracking-wide">
            Likes
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Events you liked
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Browse only events you saved with the heart icon. You get notified
            when a liked event is updated or cancelled.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
        >
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
          {(error as Error).message || "Failed to load likes"}
        </div>
      ) : null}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : totalEmpty ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
          <Heart className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p className="text-lg font-semibold text-gray-800 dark:text-white">
            No liked events yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tap the heart on any event in the list to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {likedEvents.map((card) => {
            if (hiddenIds.has(card.id)) return null;
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedEvent(card.entity)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedEvent(card.entity);
                  }
                }}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm cursor-pointer hover:border-red-200 dark:hover:border-red-800/60 transition-colors text-left"
              >
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-purple-50 dark:bg-purple-900/40 flex items-center justify-center shrink-0">
                    {card.photoPath ? (
                      <img
                        src={EP.assetUrl(card.photoPath)}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">
                      {card.name}
                    </p>
                    {card.sportName && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {card.sportName}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
                      {formatEventDateTime(card.startTime)}
                    </p>
                    {card.facilityName && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {card.facilityName}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleUnlike(card);
                    }}
                    disabled={pendingIds.has(card.id)}
                    className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60"
                  >
                    {pendingIds.has(card.id) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : successIds.has(card.id) ? (
                      <Check className="w-4 h-4 text-green-600" />
                    ) : (
                      "Unlike"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ViewEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={
          selectedEvent
            ? ({
                ...selectedEvent,
                createdAt:
                  (selectedEvent.createdAt as string) ||
                  new Date().toISOString(),
              } as React.ComponentProps<typeof ViewEventModal>["event"])
            : null
        }
        onCoachClick={(coachId) => {
          setSelectedEvent(null);
          onCoachClick(coachId);
        }}
        onFacilityClick={(facility) => {
          if (facility) {
            setSelectedEvent(null);
            setSelectedFacility(facility);
          }
        }}
        onClubClick={(club) => {
          if (club?._id && club?.name) {
            setSelectedEvent(null);
            setSelectedClub({ _id: club._id, name: club.name });
          }
        }}
        onGroupClick={(group) => {
          if (group?._id && group?.name) {
            setSelectedEvent(null);
            setSelectedGroup({ _id: group._id, name: group.name });
          }
        }}
      />
      <FacilityDetailsModal
        isOpen={!!selectedFacility}
        onClose={() => setSelectedFacility(null)}
        facility={selectedFacility as React.ComponentProps<typeof FacilityDetailsModal>["facility"]}
      />
      <ClubViewModal
        isOpen={!!selectedClub}
        onClose={() => setSelectedClub(null)}
        club={selectedClub}
      />
      <GroupViewModal
        isOpen={!!selectedGroup}
        onClose={() => setSelectedGroup(null)}
        group={selectedGroup}
      />
      {coachProfileModal}
    </div>
  );
};

export default FavoritesContent;
