"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Calendar,
  Loader2,
  Mic2,
  RefreshCcw,
  UserCheck,
} from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ViewEventModal from "@/components/event/ViewEventModal";
import FacilityDetailsModal from "@/components/profile/FacilityDetailsModal";
import ClubViewModal, { type ClubViewModalClub } from "@/components/ClubViewModal";
import GroupViewModal, { type GroupViewModalGroup } from "@/components/GroupViewModal";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";

type ActivityEvent = Record<string, unknown> & {
  _id: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  sport?: { name?: string };
  facility?: { name?: string };
  photo?: { path?: string };
  banner?: { path?: string };
  owner?: { _id?: string };
  backupCoach?: { _id?: string };
};

function formatEventDateTime(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function eventImagePath(ev: ActivityEvent): string | undefined {
  return ev.photo?.path || ev.banner?.path;
}

function isUserEventHost(ev: ActivityEvent, userId: string) {
  const ownerId =
    typeof ev.owner === "object" && ev.owner?._id
      ? String(ev.owner._id)
      : typeof ev.owner === "string"
        ? ev.owner
        : "";
  const backupId =
    typeof ev.backupCoach === "object" && ev.backupCoach?._id
      ? String(ev.backupCoach._id)
      : typeof ev.backupCoach === "string"
        ? ev.backupCoach
        : "";
  return ownerId === userId || backupId === userId;
}

function EventActivityCard({
  event,
  onClick,
}: {
  event: ActivityEvent;
  onClick: () => void;
}) {
  const img = eventImagePath(event);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 shadow-sm hover:border-cyan-300 dark:hover:border-cyan-700 transition-colors"
    >
      <div className="flex gap-3">
        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
          {img ? (
            <img
              src={EP.assetUrl(img)}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <Calendar className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-white line-clamp-2">
            {event.name || "Event"}
          </p>
          {event.sport?.name && (
            <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
              {event.sport.name}
            </p>
          )}
          <p className="text-xs text-gray-600 dark:text-slate-300 mt-1">
            {formatEventDateTime(event.startTime)}
          </p>
          {event.facility?.name && (
            <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
              {event.facility.name}
            </p>
          )}
        </div>
      </div>
    </button>
  );
}

const ActivityContent: React.FC = () => {
  const { data: user } = useMe();
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();

  const [joinedEvents, setJoinedEvents] = useState<ActivityEvent[]>([]);
  const [hostedEvents, setHostedEvents] = useState<ActivityEvent[]>([]);
  const [loadingJoined, setLoadingJoined] = useState(false);
  const [loadingHosted, setLoadingHosted] = useState(false);
  const [error, setError] = useState("");

  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<unknown>(null);
  const [selectedClub, setSelectedClub] = useState<ClubViewModalClub | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModalGroup | null>(null);

  const canHost = !!(user?.coach || user?.role === 0);
  const hasParticipant = !!user?.participant;
  const isGamerOnly = hasParticipant && !canHost;

  const loadJoined = async () => {
    if (!user?.participant) {
      setJoinedEvents([]);
      return;
    }
    setLoadingJoined(true);
    try {
      const res = await fetchJSON(EP.PARTICIPANT.myReservations, {
        method: "POST",
        body: {
          perPage: 50,
          pageNumber: 1,
          reservationScope: "participated",
        },
      });
      if (res?.success && Array.isArray(res.data)) {
        setJoinedEvents(res.data as ActivityEvent[]);
      } else {
        setJoinedEvents([]);
      }
    } catch (e) {
      setJoinedEvents([]);
      setError(e instanceof Error ? e.message : "Failed to load joined events");
    } finally {
      setLoadingJoined(false);
    }
  };

  const loadHosted = async () => {
    if (!canHost || !user) {
      setHostedEvents([]);
      return;
    }
    setLoadingHosted(true);
    try {
      const res = await fetchJSON(EP.COACH.myCreatedEvents, {
        method: "POST",
        body: { perPage: 50, pageNumber: 1 },
      });
      let rows: ActivityEvent[] = Array.isArray(res?.data)
        ? (res.data as ActivityEvent[])
        : [];
      if (user.role === 0 && !user.coach) {
        const uid = String(user._id);
        rows = rows.filter((ev) => isUserEventHost(ev, uid));
      }
      setHostedEvents(rows);
    } catch (e) {
      setHostedEvents([]);
      if (!error) {
        setError(e instanceof Error ? e.message : "Failed to load hosted events");
      }
    } finally {
      setLoadingHosted(false);
    }
  };

  const refresh = async () => {
    setError("");
    await Promise.all([loadJoined(), loadHosted()]);
  };

  useEffect(() => {
    if (!user) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, user?.participant, user?.coach, user?.role]);

  const subtitle = useMemo(() => {
    if (isGamerOnly) {
      return "Events you have joined up to today.";
    }
    if (canHost && hasParticipant) {
      return "Events you hosted and events you joined.";
    }
    if (canHost) {
      return "Events you created or co-hosted.";
    }
    return "Your event activity.";
  }, [canHost, hasParticipant, isGamerOnly]);

  if (!user) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-slate-700">
        <p className="text-gray-700 dark:text-gray-200">
          Sign in to view your activity.
        </p>
      </div>
    );
  }

  const showJoinedSection = hasParticipant;
  const showHostedSection = canHost;
  const isLoading = loadingJoined || loadingHosted;
  const totalCount = joinedEvents.length + hostedEvents.length;
  const isEmpty = !isLoading && totalCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-violet-600 dark:text-violet-400 font-semibold uppercase tracking-wide">
            Activity
          </p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Your event history
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:bg-red-900/30 dark:border-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      ) : null}

      {isEmpty ? (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-8 text-center shadow-sm">
          <Activity className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-slate-600" />
          <p className="text-lg font-semibold text-gray-800 dark:text-white">
            No activity yet
          </p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {hasParticipant
              ? "Join events from the dashboard — they will appear here after they end."
              : "Create or join events to build your activity history."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {showHostedSection && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/40">
                  <Mic2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Events you hosted ({hostedEvents.length})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Created or backup-coached
                  </p>
                </div>
              </div>
              {loadingHosted ? (
                <div className="h-24 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 animate-pulse" />
              ) : hostedEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 px-1">
                  No hosted events yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {hostedEvents.map((ev) => (
                    <EventActivityCard
                      key={String(ev._id)}
                      event={ev}
                      onClick={() => setSelectedEvent(ev)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {showJoinedSection && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/40">
                  <UserCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Events you joined ({joinedEvents.length})
                  </p>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Completed events you took part in
                  </p>
                </div>
              </div>
              {loadingJoined ? (
                <div className="h-24 rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 animate-pulse" />
              ) : joinedEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400 px-1">
                  {hasParticipant
                    ? "No completed joined events yet."
                    : "Create a gamer profile to join events."}
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {joinedEvents.map((ev) => (
                    <EventActivityCard
                      key={String(ev._id)}
                      event={ev}
                      onClick={() => setSelectedEvent(ev)}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
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
        onCoachClick={onCoachClick}
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
        facility={
          selectedFacility as React.ComponentProps<
            typeof FacilityDetailsModal
          >["facility"]
        }
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

export default ActivityContent;
