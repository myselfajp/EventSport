"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchJSON } from "../lib/api";
import { EP } from "../lib/endpoints";
import { useMe } from "./useAuth";

export type FollowType = "group" | "company" | "club" | "facility" | "coach";

export const defaultFollowLists: Record<FollowType, any[]> = {
  group: [],
  company: [],
  club: [],
  facility: [],
  coach: [],
};

export interface FollowsQueryData {
  raw: any;
  follows: any[];
  grouped: Record<FollowType, any[]>;
  pagination?: any;
  filters?: any;
  counts: { total: number } & Record<FollowType, number>;
}

type FollowParams = {
  type?: FollowType | "all";
  page?: number;
  limit?: number;
  sort?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
};

const followEndpointMap: Record<FollowType, string> = {
  group: EP.PARTICIPANT.follow.group,
  company: EP.PARTICIPANT.follow.company,
  club: EP.PARTICIPANT.follow.club,
  facility: EP.PARTICIPANT.follow.facility,
  coach: EP.PARTICIPANT.follow.coach,
};

const unfollowEndpointMap: Record<FollowType, string> = {
  group: EP.PARTICIPANT.unfollow.group,
  company: EP.PARTICIPANT.unfollow.company,
  club: EP.PARTICIPANT.unfollow.club,
  facility: EP.PARTICIPANT.unfollow.facility,
  coach: EP.PARTICIPANT.unfollow.coach,
};

const followPayloadKeyMap: Record<FollowType, string> = {
  group: "GroupId",
  company: "companyId",
  club: "clubId",
  facility: "facilityId",
  coach: "coachId",
};

const unfollowPayloadKeyMap: Record<FollowType, string> = {
  group: "groupId",
  company: "companyId",
  club: "clubId",
  facility: "facilityId",
  coach: "coachId",
};

const buildFollowsUrl = (params?: FollowParams) => {
  const searchParams = new URLSearchParams();

  if (params?.type && params.type !== "all") {
    searchParams.set("type", params.type);
  }
  if (params?.page) searchParams.set("page", String(params.page));
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.search) searchParams.set("search", params.search);
  if (params?.startDate) searchParams.set("startDate", params.startDate);
  if (params?.endDate) searchParams.set("endDate", params.endDate);

  const qs = searchParams.toString();
  return qs ? `${EP.PARTICIPANT.getFollows}?${qs}` : EP.PARTICIPANT.getFollows;
};

const detectType = (item: any): FollowType | null => {
  const raw = item?.followingType;
  if (raw && typeof raw === "string") {
    const lower = raw.toLowerCase();
    if (
      lower === "group" ||
      lower === "company" ||
      lower === "club" ||
      lower === "facility" ||
      lower === "coach"
    ) {
      return lower as FollowType;
    }
  }

  if (item?.followingCoach) return "coach";
  if (item?.followingFacility) return "facility";
  if (item?.followingCompany) return "company";
  if (item?.followingClub) return "club";
  if (item?.followingClubGroup) return "group";
  return null;
};

const normalizeFollows = (response: any): FollowsQueryData => {
  const payload = response?.data ?? response ?? {};
  const follows = Array.isArray(payload?.follows) ? payload.follows : [];

  const grouped: Record<FollowType, any[]> = {
    group: [],
    company: [],
    club: [],
    facility: [],
    coach: [],
  };

  follows.forEach((item: any) => {
    const type = detectType(item);
    if (type && grouped[type]) grouped[type].push(item);
  });

  const counts = {
    total: follows.length,
    group: grouped.group.length,
    company: grouped.company.length,
    club: grouped.club.length,
    facility: grouped.facility.length,
    coach: grouped.coach.length,
  };

  return {
    raw: response,
    follows,
    grouped,
    pagination: payload?.pagination,
    filters: payload?.filters,
    counts,
  };
};

export function useFollows(params?: FollowParams) {
  const { data: user } = useMe();

  return useQuery({
    queryKey: ["follows", user?._id, params],
    queryFn: async () => {
      const res = await fetchJSON(buildFollowsUrl(params), { method: "GET" });
      if (res?.success === false) {
        throw new Error(res?.message || "Failed to load follows");
      }
      return res;
    },
    enabled: !!user?._id,
    staleTime: 1000 * 60 * 5,
    select: normalizeFollows,
  });
}

export function useFollowMutation() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: FollowType; id: string }) => {
      const endpoint = followEndpointMap[type];
      const payloadKey = followPayloadKeyMap[type];
      if (!endpoint || !payloadKey) {
        throw new Error("Unknown follow type");
      }
      const response = await fetchJSON(endpoint, {
        method: "POST",
        body: { [payloadKey]: id },
      });
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to follow");
      }
      return { response, type, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows", user?._id] });
    },
  });
}

export function useUnfollowMutation() {
  const { data: user } = useMe();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ type, id }: { type: FollowType; id: string }) => {
      const endpoint = unfollowEndpointMap[type];
      const payloadKey = unfollowPayloadKeyMap[type];
      if (!endpoint || !payloadKey) {
        throw new Error("Unknown follow type");
      }
      const response = await fetchJSON(endpoint, {
        method: "POST",
        body: { [payloadKey]: id },
      });
      if (response?.success === false) {
        throw new Error(response?.message || "Failed to unfollow");
      }
      return { response, type, id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follows", user?._id] });
    },
  });
}
