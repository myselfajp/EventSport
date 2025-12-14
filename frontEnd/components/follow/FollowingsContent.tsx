"use client";

import React, { useMemo, useState } from "react";
import {
  Building,
  Home,
  Layers,
  Loader2,
  RefreshCcw,
  Shield,
  User2,
  Users,
  Check,
} from "lucide-react";
import {
  FollowType,
  defaultFollowLists,
  useFollows,
  useUnfollowMutation,
} from "@/app/hooks/useFollows";
import { useMe } from "@/app/hooks/useAuth";
import { EP } from "@/app/lib/endpoints";
import UserProfileModal from "@/components/UserProfileModal";
import FacilityDetailsModal from "@/components/profile/FacilityDetailsModal";
import CompanyDetailsModal from "@/components/profile/CompanyDetailsModal";
import ClubViewModal from "@/components/ClubViewModal";
import GroupViewModal from "@/components/GroupViewModal";

type TypeMeta = {
  label: string;
  icon: React.ReactNode;
  bgClass: string;
  pillClass: string;
};

const typeMeta: Record<FollowType, TypeMeta> = {
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
  club: {
    label: "Club",
    icon: <Shield className="w-5 h-5 text-purple-600" />,
    bgClass: "bg-purple-50 dark:bg-purple-900/40",
    pillClass:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  company: {
    label: "Company",
    icon: <Building className="w-5 h-5 text-amber-600" />,
    bgClass: "bg-amber-50 dark:bg-amber-900/40",
    pillClass:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  group: {
    label: "Group",
    icon: <Layers className="w-5 h-5 text-blue-600" />,
    bgClass: "bg-blue-50 dark:bg-blue-900/40",
    pillClass:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
};

type FollowCardInfo = {
  id: string;
  entityId: string;
  name: string;
  subtitle: string;
  photoPath?: string;
  type: FollowType;
  createdAt?: string;
  entity?: any;
};

const getFollowCardInfo = (
  follow: any,
  fallbackType: FollowType
): FollowCardInfo => {
  const type =
    (follow?.followingType as FollowType) ||
    fallbackType ||
    (follow?.followingCoach && "coach") ||
    (follow?.followingFacility && "facility") ||
    (follow?.followingCompany && "company") ||
    (follow?.followingClub && "club") ||
    (follow?.followingClubGroup && "group") ||
    "coach";
  const createdAt = follow?.createdAt;
  const pickId = (...candidates: any[]) =>
    candidates.find(
      (val) => typeof val === "string" && val.trim().length > 0
    ) ||
    candidates.find((val) => val?._id) ||
    "";

  const pickName = (entity: any, fallback: string) =>
    entity?.name ||
    [entity?.firstName, entity?.lastName].filter(Boolean).join(" ").trim() ||
    fallback;

  const pickEntity = (primary: any, ...alts: any[]) =>
    primary || alts.find((a) => !!a) || {};

  if (type === "coach") {
    const entity = pickEntity(
      follow?.followingCoach,
      follow?.coach,
      follow?.user,
      follow?.coachId
    );
    return {
      id: follow?._id || "",
      entityId:
        pickId(
          entity?._id,
          entity?.id,
          entity?.coachId,
          follow?.followingCoach
        ) || "",
      name: pickName(entity, "Coach"),
      subtitle: entity?.specialty || "Coach",
      photoPath: entity?.photo?.path,
      type,
      createdAt,
      entity,
    };
  }

  if (type === "facility") {
    const entity = pickEntity(
      follow?.followingFacility,
      follow?.facility,
      follow?.facilityId
    );
    return {
      id: follow?._id || "",
      entityId:
        pickId(
          entity?._id,
          entity?.id,
          entity?.facilityId,
          follow?.followingFacility
        ) || "",
      name: pickName(entity, "Facility"),
      subtitle: entity?.location || entity?.address || "Facility",
      photoPath: entity?.photo?.path || entity?.image,
      type,
      createdAt,
      entity,
    };
  }

  if (type === "company") {
    const entity = pickEntity(
      follow?.followingCompany,
      follow?.company,
      follow?.companyId
    );
    return {
      id: follow?._id || "",
      entityId:
        pickId(
          entity?._id,
          entity?.id,
          entity?.companyId,
          follow?.followingCompany
        ) || "",
      name: pickName(entity, "Company"),
      subtitle: entity?.location || entity?.address || "Company",
      photoPath: entity?.photo?.path || entity?.image,
      type,
      createdAt,
      entity,
    };
  }

  if (type === "club") {
    const entity = pickEntity(
      follow?.followingClub,
      follow?.club,
      follow?.clubId
    );
    return {
      id: follow?._id || "",
      entityId:
        pickId(
          entity?._id,
          entity?.id,
          entity?.clubId,
          follow?.followingClub
        ) || "",
      name: pickName(entity, "Club"),
      subtitle: entity?.vision || "Club",
      photoPath: entity?.photo?.path || entity?.image,
      type,
      createdAt,
      entity,
    };
  }

  const entity = pickEntity(
    follow?.followingClubGroup,
    follow?.group,
    follow?.groupId
  );
  return {
    id: follow?._id || "",
    entityId:
      pickId(
        entity?._id,
        entity?.id,
        entity?.groupId,
        follow?.followingClubGroup
      ) || "",
    name: pickName(entity, "Group"),
    subtitle: entity?.clubName ? `Club: ${entity.clubName}` : "Group",
    photoPath: entity?.photo?.path || entity?.image,
    type,
    createdAt,
    entity,
  };
};

const formatDate = (date?: string) => {
  if (!date) return "Unknown date";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "Unknown date";
  return d.toLocaleDateString();
};

const FollowingsContent: React.FC = () => {
  const { data: user } = useMe();
  const [activeType, setActiveType] = useState<FollowType | "all">("all");
  const { data, isLoading, isFetching, error, refetch } = useFollows({
    limit: 100,
  });
  const { mutateAsync: unfollowAsync } = useUnfollowMutation();
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<any | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<any | null>(null);
  const [selectedClub, setSelectedClub] = useState<any | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

  const grouped = data?.grouped ?? defaultFollowLists;
  const counts =
    data?.counts ??
    ({
      total: 0,
      group: 0,
      company: 0,
      club: 0,
      facility: 0,
      coach: 0,
    } as const);

  const sections = useMemo(() => {
    const source =
      activeType === "all"
        ? grouped
        : { ...defaultFollowLists, [activeType]: grouped[activeType] };

    return (Object.keys(typeMeta) as FollowType[]).map((type) => ({
      type,
      items: source[type] || [],
      meta: typeMeta[type],
    }));
  }, [activeType, grouped]);

  const handleUnfollow = async (follow: any, type: FollowType) => {
    const info = getFollowCardInfo(follow, type);
    if (!info.entityId) return;

    setHiddenIds((prev) => new Set(prev).add(info.id));

    const next = new Set(pendingIds);
    next.add(info.id);
    setPendingIds(next);

    try {
      await unfollowAsync({ type: info.type, id: info.entityId });
    } catch (err) {
      // revert on failure
      setHiddenIds((prev) => {
        const nextHidden = new Set(prev);
        nextHidden.delete(info.id);
        return nextHidden;
      });
    } finally {
      setPendingIds((prev) => {
        const updated = new Set(prev);
        updated.delete(info.id);
        return updated;
      });
    }
  };

  const handleCardClick = (info: FollowCardInfo) => {
    if (info.type === "coach") {
      setSelectedCoachId(info.entityId);
    } else if (info.type === "facility") {
      setSelectedFacility(info.entity);
    } else if (info.type === "company") {
      setSelectedCompany(info.entity);
    } else if (info.type === "club") {
      setSelectedClub(info.entity);
    } else if (info.type === "group") {
      setSelectedGroup(info.entity);
    }
  };

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Sign in to view and manage your followings.
        </p>
      </div>
    );
  }

  if (!user.participant) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Create a participant profile to start following coaches, facilities,
          clubs, companies, and groups.
        </p>
      </div>
    );
  }

  const totalEmpty = counts.total === 0 && !isLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-cyan-500 font-semibold uppercase tracking-wide">
            Followings
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            People and places you follow
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Quick view of coaches, companies, clubs, facilities, and groups
            you're keeping up with.
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
        {(["all", ...Object.keys(typeMeta)] as (FollowType | "all")[]).map(
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
                    counts[type as FollowType] || 0
                  })`}
            </button>
          )
        )}
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/30 dark:border-red-700 dark:text-red-200">
          {(error as Error).message || "Failed to load followings"}
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
          <Users className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p className="text-lg font-semibold text-gray-800 dark:text-white">
            You are not following anyone yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Follow coaches, facilities, clubs, companies, or groups to see them
            here.
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
                      Followed {meta.label.toLowerCase()}s
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {items.map((follow: any) => {
                    const info = getFollowCardInfo(follow, type);
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
                              handleUnfollow(follow, type);
                            }}
                            disabled={pendingIds.has(info.id)}
                            className="text-xs px-3 py-1.5 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {pendingIds.has(info.id) ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : successIds.has(info.id) ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              "Unfollow"
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
      <CompanyDetailsModal
        isOpen={!!selectedCompany}
        onClose={() => setSelectedCompany(null)}
        company={selectedCompany}
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
      <UserProfileModal
        isOpen={!!selectedCoachId}
        onClose={() => setSelectedCoachId(null)}
        userId={selectedCoachId}
        context="coach"
      />
    </div>
  );
};

export default FollowingsContent;

