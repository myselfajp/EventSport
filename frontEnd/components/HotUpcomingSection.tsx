"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Flame } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  formatCountdownToStart,
  isHotEvent,
  isUpcomingEvent,
  type CheckInEventRef,
} from "@/app/lib/event-dashboard-utils";
import ViewEventModal from "@/components/event/ViewEventModal";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";
import HorizontalEventScroller from "@/components/dashboard/HorizontalEventScroller";
import EventCardTimes from "@/components/dashboard/EventCardTimes";
import EventCardThumbnail from "@/components/dashboard/EventCardThumbnail";

type HotEvent = CheckInEventRef & {
  _id: string;
  name: string;
  startTime: string;
  status?: string;
  private?: boolean;
  sport?: { name?: string };
  facility?: { name?: string };
  district?: { name?: string };
  photo?: { path?: string };
  banner?: { path?: string };
};

type HotUpcomingSectionProps = {
  className?: string;
};

const COLUMN_CARD_CLASS =
  "snap-center shrink-0 w-full min-w-full text-left p-4 rounded-xl border border-orange-200 dark:border-orange-800/50 bg-white/90 dark:bg-slate-900/60 hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg transition-all group flex flex-row gap-3 items-start";

const HotUpcomingSection: React.FC<HotUpcomingSectionProps> = ({
  className = "",
}) => {
  const { data: user, isPending } = useMe();
  const [candidates, setCandidates] = useState<HotEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<HotEvent | null>(null);
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();
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

  return (
    <>
      <section
        className={`h-full flex flex-col rounded-2xl border border-orange-200 dark:border-orange-900/50 bg-gradient-to-br from-orange-50 via-red-50/50 to-white dark:from-orange-950/30 dark:via-red-950/20 dark:to-slate-800/80 shadow-sm overflow-hidden min-w-0 ${className}`}
      >
        <div className="px-4 py-3 border-b border-orange-100 dark:border-orange-900/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Flame className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                HOT EVENTS
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                Starting within the next 3 hours
                {events.length > 1 ? " · swipe to see more" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 min-h-[140px] rounded-xl bg-orange-100/60 dark:bg-slate-700/50 animate-pulse" />
          ) : events.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl border border-dashed border-orange-200 dark:border-orange-800/50 bg-white/40 dark:bg-slate-900/30 px-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                No hot events in the next 3 hours.
              </p>
            </div>
          ) : (
            <HorizontalEventScroller
              itemCount={events.length}
              activeDotClass="bg-orange-500"
              ariaLabel="Hot upcoming events"
              columnSlide
            >
              {events.map((event) => {
                const countdown = formatCountdownToStart(event.startTime, nowMs);
                return (
                  <button
                    key={event._id}
                    type="button"
                    data-event-card
                    onClick={() => setSelectedEvent(event)}
                    className={COLUMN_CARD_CLASS}
                  >
                    <div className="flex-1 min-w-0">
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
                      <EventCardTimes event={event} />
                      {event.facility?.name && (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
                          {event.facility.name}
                        </p>
                      )}
                    </div>
                    <EventCardThumbnail
                      photo={event.photo}
                      banner={event.banner}
                      alt={event.name}
                    />
                  </button>
                );
              })}
            </HorizontalEventScroller>
          )}
        </div>
      </section>

      <ViewEventModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent as React.ComponentProps<typeof ViewEventModal>["event"]}
        onCoachClick={onCoachClick}
      />
      {coachProfileModal}
    </>
  );
};

export default HotUpcomingSection;
