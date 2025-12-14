"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  Heart,
  Home,
  Loader2,
  RefreshCcw,
  User2,
  Check,
} from "lucide-react";
import {
  FavoriteKind,
  defaultFavorites,
  useFavorites,
  useRemoveFavorite,
} from "@/app/hooks/useFavorites";
import { useMe } from "@/app/hooks/useAuth";
import { EP } from "@/app/lib/endpoints";
import UserProfileModal from "@/components/UserProfileModal";
import FacilityDetailsModal from "@/components/profile/FacilityDetailsModal";
import ViewEventModal from "@/components/event/ViewEventModal";

type TypeMeta = {
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  pillClass: string;
};

const typeMeta: Record<FavoriteKind, TypeMeta> = {
  coach: {
    label: "Coach",
    icon: <User2 className="w-5 h-5 text-cyan-600" />,
    bgClass: "bg-cyan-50 dark:bg-cyan-900/40",
    pillClass:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300",
  },
  facility: {
    label: "Facility",
    icon: <Home className="w-5 h-5 text-green-600" />,
    bgClass: "bg-green-50 dark:bg-green-900/40",
    pillClass:
      "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
  },
  event: {
    label: "Event",
    icon: <Calendar className="w-5 h-5 text-purple-600" />,
    bgClass: "bg-purple-50 dark:bg-purple-900/40",
    pillClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
};

type FavoriteCardInfo = {
  id: string;
  entityId: string;
  name: string;
  photoPath?: string;
  type: FavoriteKind;
  createdAt?: string;
  entity?: any;
};

const getEntityId = (favorite: any, type: FavoriteKind) => {
  if (!favorite) return "";
  if (type === "coach")
    return favorite.coach || favorite._id || favorite.id || "";
  if (type === "facility")
    return favorite.facility || favorite._id || favorite.id || "";
  return favorite.event || favorite._id || favorite.id || "";
};

const getFavoriteCardInfo = (
  favorite: any,
  fallbackType: FavoriteKind
): FavoriteCardInfo => {
  const type = (favorite?.favoriteType as FavoriteKind) || fallbackType;
  const entityId = getEntityId(favorite, type);
  const name =
    type === "coach"
      ? [favorite?.firstName, favorite?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim() || "Coach"
      : favorite?.name || (type === "facility" ? "Facility" : "Event");

  const photoPath =
    favorite?.photo?.path ||
    (favorite?.photo && typeof favorite.photo === "string"
      ? favorite.photo
      : undefined);

  return {
    id: favorite?.favoriteId || favorite?._id || favorite?.id || entityId,
    entityId,
    name,
    photoPath,
    type,
    createdAt: favorite?.createdAt,
    entity: favorite,
  };
};

const FavoritesContent: React.FC = () => {
  const { data: user } = useMe();
  const [activeType, setActiveType] = useState<FavoriteKind | "all">("all");
  const { data, isLoading, isFetching, error, refetch } = useFavorites();
  const { mutateAsync: removeFavoriteAsync } = useRemoveFavorite();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  const grouped = data?.data ?? defaultFavorites;
  const counts = {
    total:
      (grouped.coach?.length || 0) +
      (grouped.facility?.length || 0) +
      (grouped.event?.length || 0),
    coach: grouped.coach?.length || 0,
    facility: grouped.facility?.length || 0,
    event: grouped.event?.length || 0,
  };

  const sections = useMemo(() => {
    const source =
      activeType === "all"
        ? grouped
        : { ...defaultFavorites, [activeType]: grouped[activeType] };

    return (Object.keys(typeMeta) as FavoriteKind[]).map((type) => ({
      type,
      items: source[type] || [],
      meta: typeMeta[type],
    }));
  }, [activeType, grouped]);

  const handleRemove = async (favorite: any, type: FavoriteKind) => {
    const info = getFavoriteCardInfo(favorite, type);
    if (!info.entityId) return;

    setHiddenIds((prev) => new Set(prev).add(info.id));
    setPendingIds((prev) => new Set(prev).add(info.id));

    try {
      await removeFavoriteAsync({ type, id: info.entityId });
      setSuccessIds((prev) => new Set(prev).add(info.id));
    } catch (err) {
      // revert hide on failure
      setHiddenIds((prev) => {
        const next = new Set(prev);
        next.delete(info.id);
        return next;
      });
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(info.id);
        return next;
      });
      setTimeout(() => {
        setSuccessIds((prev) => {
          const next = new Set(prev);
          next.delete(info.id);
          return next;
        });
      }, 900);
    }
  };

  const handleCardClick = (info: FavoriteCardInfo) => {
    if (info.type === "coach") {
      setSelectedCoachId(info.entity?.coach || info.entityId);
    } else if (info.type === "facility") {
      setSelectedFacility(info.entity);
    } else if (info.type === "event") {
      setSelectedEvent(info.entity);
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Sign in to view and manage your favorites.
        </p>
      </div>
    );
  }

  if (!user.participant) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Create a participant profile to add favorites.
        </p>
      </div>
    );
  }

  const totalEmpty = counts.total === 0 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-red-500 font-semibold uppercase tracking-wide">
            Favorites
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            People, places, and events you love
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quick view of your favorite coaches, facilities, and events.
          </p>
        </div>
        <button
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

      <div className="flex flex-wrap gap-2">
        {(["all", ...Object.keys(typeMeta)] as (FavoriteKind | "all")[]).map(
          (type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                activeType === type
                  ? "border-cyan-500 bg-cyan-50 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-700"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-gray-200 dark:hover:bg-slate-800"
              }`}
            >
              {type === "all"
                ? `All (${counts.total})`
                : `${typeMeta[type].label} (${
                    counts[type as FavoriteKind] || 0
                  })`}
            </button>
          )
        )}
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
          {(error as Error).message || "Failed to load favorites"}
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
            You have no favorites yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Add coaches, facilities, or events to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sections.map(({ type, items, meta }) =>
            items.length === 0 ? null : (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-lg ${meta.bgClass}`}>
                    {meta.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {meta.label} ({items.length})
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Favorite {meta.label.toLowerCase()}
                      {meta.label.toLowerCase().endsWith("s") ? "" : "s"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((favorite: any) => {
                    const info = getFavoriteCardInfo(favorite, type);
                    if (hiddenIds.has(info.id)) return null;
                    return (
                      <div
                        key={info.id}
                        onClick={() => handleCardClick(info)}
                        className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 shadow-sm flex items-center gap-3 cursor-pointer hover:border-cyan-200 dark:hover:border-cyan-700 transition-colors"
                      >
                        <div
                          className={`w-12 h-12 rounded-lg overflow-hidden flex items-center justify-center ${meta.bgClass} flex-shrink-0`}
                        >
                          {info.photoPath ? (
                            <img
                              src={`${EP.API_ASSETS_BASE}/${info.photoPath}`}
                              alt={info.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            meta.icon
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 dark:text-white truncate">
                            {info.name}
                          </p>
                        </div>
                        <div className="flex items-start">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemove(favorite, type);
                            }}
                            disabled={pendingIds.has(info.id)}
                            className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {pendingIds.has(info.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : successIds.has(info.id) ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              "Remove"
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}

      <FacilityDetailsModal
        isOpen={!!selectedFacility}
        onClose={() => setSelectedFacility(null)}
        facility={selectedFacility}
      />
      <ViewEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
        onCoachClick={(coachId) => {
          setSelectedEvent(null);
          setSelectedCoachId(coachId);
        }}
      />
      <UserProfileModal
        isOpen={!!selectedCoachId}
        onClose={() => setSelectedCoachId(null)}
        userId={selectedCoachId}
        context="coach"
      />
    </div>
  );
};

export default FavoritesContent;

