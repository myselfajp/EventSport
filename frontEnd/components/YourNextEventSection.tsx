"use client";

import React, { useEffect, useState } from "react";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  formatEventDateTime,
  formatCountdownToStart,
  isUpcomingEvent,
} from "@/app/lib/event-dashboard-utils";
import ViewEventModal from "@/components/event/ViewEventModal";

type DashboardEvent = {
  _id: string;
  name: string;
  startTime: string;
  endTime?: string;
  status?: string;
  type?: string;
  sport?: { name?: string };
  facility?: { name?: string; _id?: string };
  reservation?: {
    isApproved?: boolean;
    isWaitListed?: boolean;
    isCheckedIn?: boolean;
  };
};

function pickNextEvent(events: DashboardEvent[]) {
  return events
    .filter((e) => isUpcomingEvent(e))
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )[0] ?? null;
}

const YourNextEventSection: React.FC = () => {
  const { data: user, isPending } = useMe();
  const [event, setEvent] = useState<DashboardEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !user) {
      setEvent(null);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        let next: DashboardEvent | null = null;

        if (user.participant) {
          const res = await fetchJSON(EP.PARTICIPANT.myReservations, {
            method: "POST",
            body: {
              perPage: 40,
              pageNumber: 1,
              reservationScope: "registered",
            },
          });

          const approved = (res?.data ?? []).filter(
            (e: DashboardEvent) =>
              e.reservation?.isApproved &&
              !e.reservation?.isWaitListed &&
              isUpcomingEvent(e)
          );
          next = pickNextEvent(approved);
        }

        if (!next && (user.coach || user.role === 0)) {
          const res = await fetchJSON(EP.COACH.myCreatedEvents, {
            method: "POST",
            body: { perPage: 40, pageNumber: 1 },
          });
          next = pickNextEvent(res?.data ?? []);
        }

        if (!cancelled) setEvent(next);
      } catch {
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  useEffect(() => {
    if (!event?.startTime) {
      setCountdown(null);
      return;
    }

    const tick = () => {
      setCountdown(formatCountdownToStart(event.startTime));
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, [event?.startTime]);

  if (isPending || !user) return null;
  if (!loading && !event) return null;

  return (
    <>
      <section className="rounded-2xl border border-cyan-200 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/40 dark:to-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-cyan-100 dark:border-cyan-900/50">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
            Your Next Event
          </h2>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="h-28 rounded-xl bg-white/60 dark:bg-slate-700/50 animate-pulse" />
          ) : event ? (
            <button
              type="button"
              onClick={() => setViewOpen(true)}
              className="w-full text-left group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-cyan-100 dark:border-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md transition-all"
            >
              <div className="flex-1 min-w-0">
                <p className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-cyan-700 dark:group-hover:text-cyan-300 line-clamp-2">
                  {event.name}
                </p>
                {event.sport?.name && (
                  <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                    {event.sport.name}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-600 dark:text-slate-300">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    {formatEventDateTime(event.startTime)}
                  </span>
                  {event.facility?.name && (
                    <span className="text-gray-500 dark:text-slate-400 truncate max-w-[200px]">
                      {event.facility.name}
                    </span>
                  )}
                </div>
              </div>

              {countdown && (
                <div className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-xl bg-cyan-600 text-white shadow-md shadow-cyan-600/25">
                  <Clock className="w-5 h-5" />
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-90">Starts in</p>
                    <p className="text-lg font-bold leading-tight">{countdown}</p>
                  </div>
                </div>
              )}

              <ChevronRight className="hidden sm:block w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          ) : null}
        </div>
      </section>

      <ViewEventModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        event={event as React.ComponentProps<typeof ViewEventModal>["event"]}
        onCoachClick={() => {}}
      />
    </>
  );
};

export default YourNextEventSection;
