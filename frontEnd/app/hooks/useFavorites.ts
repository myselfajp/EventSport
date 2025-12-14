"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "../lib/api";
import { EP } from "../lib/endpoints";
import { useMe } from "./useAuth";

export type FavoriteKind = "coach" | "facility" | "event";

type FavoritesGrouped = Record<FavoriteKind, any[]>;

const createEmptyFavorites = (): FavoritesGrouped => ({
  coach: [],
  facility: [],
  event: [],
});

export const defaultFavorites: FavoritesGrouped = createEmptyFavorites();

const endpointMap: Record<FavoriteKind, string> = {
  coach: EP.PARTICIPANT.favoriteCoach,
  facility: EP.PARTICIPANT.favoriteFacility,
  event: EP.PARTICIPANT.favoriteEvent,
};

const removeEndpoint = (type: FavoriteKind) => EP.PARTICIPANT.unfavorite(type);

const payloadKeyMap: Record<FavoriteKind, string> = {
  coach: "coachId",
  facility: "facilityId",
  event: "eventId",
};

const getFavoriteId = (item: any, type: FavoriteKind) => {
  if (!item) return null;
  if (typeof item === "string") return item;

  if (type === "coach") {
    return item.coach || item._id || item.id;
  }

  return item._id || item.id || item.event || item.facility;
};

const normalizeFavoritesList = (favoritesList: any[]): FavoritesGrouped => {
  const grouped: FavoritesGrouped = createEmptyFavorites();

  favoritesList.forEach((entry) => {
    if (entry?.coach) {
      grouped.coach.push({
        ...entry.coach,
        favoriteId: entry._id,
        favoriteType: "coach",
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }
    if (entry?.facility) {
      grouped.facility.push({
        ...entry.facility,
        favoriteId: entry._id,
        favoriteType: "facility",
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }
    if (entry?.event) {
      grouped.event.push({
        ...entry.event,
        favoriteId: entry._id,
        favoriteType: "event",
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      });
    }
  });

  return grouped;
};

const prepareFavoritesData = (response: any) => {
  const favoritesFromResponse = Array.isArray(response?.data?.favorites)
    ? response.data.favorites
    : Array.isArray(response?.favorites)
    ? response.favorites
    : [];

  const fallbackSource = response?.data || response || {};

  const grouped =
    favoritesFromResponse.length > 0
      ? normalizeFavoritesList(favoritesFromResponse)
      : {
          coach: Array.isArray(fallbackSource?.coach)
            ? [...fallbackSource.coach]
            : [],
          facility: Array.isArray(fallbackSource?.facility)
            ? [...fallbackSource.facility]
            : [],
          event: Array.isArray(fallbackSource?.event)
            ? [...fallbackSource.event]
            : [],
        };

  return {
    success: response?.success ?? true,
    data: grouped,
    favorites: favoritesFromResponse,
    pagination:
      response?.data?.pagination || fallbackSource?.pagination || null,
    filters: response?.data?.filters || fallbackSource?.filters || null,
  };
};

const mergeFavorites = (
  previousData: FavoritesGrouped,
  serverData: any,
  type: FavoriteKind,
  id: string,
  entity?: any
) => {
  const base =
    serverData && typeof serverData === "object"
      ? serverData
      : previousData && typeof previousData === "object"
      ? previousData
      : defaultFavorites;

  const result: FavoritesGrouped = {
    coach: Array.isArray(base?.coach) ? [...base.coach] : [],
    facility: Array.isArray(base?.facility) ? [...base.facility] : [],
    event: Array.isArray(base?.event) ? [...base.event] : [],
  };

  const list = result[type] || [];
  const favoriteId = id;
  let found = false;

  const updatedList = list.map((entry) => {
    if (getFavoriteId(entry, type) === favoriteId) {
      found = true;
      return entity ?? entry;
    }
    return entry;
  });

  if (!found) {
    updatedList.unshift(entity ?? favoriteId);
  }

  result[type] = updatedList;
  return result;
};

const removeFromFavorites = (
  previousData: FavoritesGrouped,
  serverData: any,
  type: FavoriteKind,
  id: string
) => {
  const base =
    serverData && typeof serverData === "object"
      ? serverData
      : previousData && typeof previousData === "object"
      ? previousData
      : defaultFavorites;

  const result: FavoritesGrouped = {
    coach: Array.isArray(base?.coach) ? [...base.coach] : [],
    facility: Array.isArray(base?.facility) ? [...base.facility] : [],
    event: Array.isArray(base?.event) ? [...base.event] : [],
  };

  result[type] = (result[type] || []).filter(
    (entry) => getFavoriteId(entry, type) !== id
  );

  return result;
};

export function useFavorites() {
  const { data: user } = useMe();

  return useQuery({
    queryKey: ["favorites", user?._id],
    queryFn: async () => {
      const params = new URLSearchParams({
        type: "all",
        page: "1",
        limit: "100",
        sort: "-createdAt",
      });
      const response = await fetchJSON(
        `${EP.PARTICIPANT.getFavorites}?${params.toString()}`,
        { method: "GET" }
      );
      return prepareFavoritesData(response);
    },
    enabled: !!user?._id,
    staleTime: 1000 * 60 * 5,
  });
}

export function useAddFavorite() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      type,
      id,
      entity,
    }: {
      type: FavoriteKind;
      id: string;
      entity?: any;
    }) => {
      const endpoint = endpointMap[type];
      const payloadKey = payloadKeyMap[type];

      if (!endpoint || !payloadKey) {
        throw new Error("Unknown favorite type");
      }

      const response = await fetchJSON(endpoint, {
        method: "POST",
        body: { [payloadKey]: id },
      });

      return { response, type, id, entity };
    },
    onMutate: async ({ type, id, entity }) => {
      const key = ["favorites", user?._id];
      await queryClient.cancelQueries({ queryKey: key });

      const previous = queryClient.getQueryData(key);
      const previousData = (previous as any)?.data ?? previous;
      const optimistic = mergeFavorites(previousData, null, type, id, entity);

      queryClient.setQueryData(key, (old: any) => ({
        ...(old || {}),
        data: optimistic,
      }));

      return { previous, key };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: ({ response, type, id, entity }) => {
      const key = ["favorites", user?._id];
      const previous = queryClient.getQueryData(key);
      const previousData = (previous as any)?.data ?? previous;
      const merged = mergeFavorites(
        previousData,
        response?.data,
        type,
        id,
        entity
      );

      queryClient.setQueryData(key, (old: any) => ({
        ...(old || {}),
        data: merged,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?._id] });
    },
  });
}

export function useRemoveFavorite() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: FavoriteKind; id: string }) => {
      const endpoint = removeEndpoint(type);
      const payloadKey = payloadKeyMap[type];
      const response = await fetchJSON(endpoint, {
        method: "DELETE",
        body: { [payloadKey]: id },
      });
      return { response, type, id };
    },
    onMutate: async ({ type, id }) => {
      const key = ["favorites", user?._id];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      const previousData = (previous as any)?.data ?? previous;
      const optimistic = removeFromFavorites(previousData, null, type, id);
      queryClient.setQueryData(key, (old: any) => ({
        ...(old || {}),
        data: optimistic,
      }));
      return { previous, key };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },
    onSuccess: ({ response, type, id }) => {
      const key = ["favorites", user?._id];
      const previous = queryClient.getQueryData(key);
      const previousData = (previous as any)?.data ?? previous;
      const merged = removeFromFavorites(
        previousData,
        response?.data,
        type,
        id
      );
      queryClient.setQueryData(key, (old: any) => ({
        ...(old || {}),
        data: merged,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["favorites", user?._id] });
    },
  });
}

export function isFavorited(
  favorites: any,
  type: FavoriteKind,
  id: string
): boolean {
  const data = favorites?.data ?? favorites ?? defaultFavorites;
  const grouped =
    Array.isArray((data as any)?.favorites) && !(data as any)?.[type]
      ? normalizeFavoritesList((data as any).favorites)
      : data;

  const list = Array.isArray((grouped as any)?.[type])
    ? (grouped as any)[type]
    : [];
  return list.some((item: any) => getFavoriteId(item, type) === id);
}
