"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Flame, Calendar } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  formatEventDateTime,
  formatCountdownToStart,
  isHotEvent,
  isUpcomingEvent,
} from "@/app/lib/event-dashboard-utils";
import ViewEventModal from "@/components/event/ViewEventModal";

type HotEvent = {
  _id: string;
  name: string;
  startTime: string;
  status?: string;
  private?: boolean;
  sport?: { name?: string };
  facility?: { name?: string };
  district?: { name?: string };
};

const HotUpcomingSection: React.FC = () => {
  const { data: user, isPending } = useMe();
  const [candidates, setCandidates] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<HotEvent | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const events = useMemo(
    () =>
      candidates
        .filter(
          (e) =>
            isUpcomingEvent(e, nowMs) &&
            isHotEvent(e.startTime, nowMs, 3) &&
            e.private !== true
        )
        .slice(0, 8),
    [candidates, nowMs]
  );

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isPending || !user) {
      setCandidates([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetchJSON(EP.EVENTS.getEvents, {
          method: "POST",
          body: {
            perPage: 50,
            pageNumber: 1,
            sortBy: "startTime",
            sortType: "asc",
            private: false,
          },
        });

        if (cancelled) return;

        const upcoming = (res?.data ?? []).filter((e: HotEvent) =>
          isUpcomingEvent(e)
        );
        setCandidates(upcoming);
      } catch {
        if (!cancelled) setCandidates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  if (isPending || !user) return null;
  if (!loading && events.length === 0) return null;

  return (
    <>
      <section className="rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50 via-red-50/50 to-white dark:from-orange-950/30 dark:via-red-950/20 dark:to-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-orange-100 dark:border-orange-900/40 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500 shrink-0" />
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              HOT — Upcoming
            </h2>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Starting within the next 3 hours
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-64 h-28 rounded-xl bg-orange-100/60 dark:bg-slate-700/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin">
              {events.map((event) => {
                const countdown = formatCountdownToStart(event.startTime, nowMs);
                return (
                  <button
                    key={event._id}
                    type="button"
                    onClick={() => setSelectedEvent(event)}
                    className="snap-start shrink-0 w-64 sm:w-72 text-left p-4 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-white/90 dark:bg-slate-900/60 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500 text-white">
                        <Flame className="w-3 h-3" />
                        HOT
                      </span>
                      {countdown && (
                        <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                          {countdown}
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-orange-700 dark:group-hover:text-orange-300">
                      {event.name}
                    </p>
                    {event.sport?.name && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {event.sport.name}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 dark:text-slate-300">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatEventDateTime(event.startTime)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <ViewEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent as React.ComponentProps<typeof ViewEventModal>["event"]}
        onCoachClick={() => {}}
      />
    </>
  );
};

export default HotUpcomingSection;
