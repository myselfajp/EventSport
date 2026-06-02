"use client";

import React, { useEffect, useState } from "react";
import { Clock, LogIn } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import {
  formatEventDateTime,
  formatCheckInCountdown,
  getCheckInOpensAt,
} from "@/app/lib/event-dashboard-utils";
import {
  fetchUserDashboardEvents,
  getCheckInEmptyMessage,
  getDashboardUserMode,
  sortByCheckInOpens,
  type DashboardEvent,
} from "@/app/lib/dashboard-event-sources";
import ViewEventModal from "@/components/event/ViewEventModal";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";
import HorizontalEventScroller from "@/components/dashboard/HorizontalEventScroller";

type CheckInTimesSectionProps = {
  className?: string;
};

const COLUMN_CARD_CLASS =
  "snap-center shrink-0 w-full min-w-full text-left p-4 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-white/90 dark:bg-slate-900/60 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-lg transition-all group";

const CheckInTimesSection: React.FC<CheckInTimesSectionProps> = ({
  className = "",
}) => {
  const { data: user, isPending } = useMe();
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | null>(null);
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (isPending || !user) {
      setEvents([]);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const all = await fetchUserDashboardEvents(user);
        if (!cancelled) setEvents(sortByCheckInOpens(all));
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isPending]);

  if (isPending || !user) return null;

  const mode = getDashboardUserMode(user);
  const emptyMessage = getCheckInEmptyMessage(mode);

  return (
    <>
      <section
        className={`h-full flex flex-col rounded-2xl border border-violet-200 dark:border-violet-800/50 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-sm overflow-hidden min-w-0 ${className}`}
      >
        <div className="px-4 py-3 border-b border-violet-100 dark:border-violet-900/40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <LogIn className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                Check-in
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {mode === "gamer"
                  ? "Your joined events"
                  : "Joined or hosted events"}
                {events.length > 1 ? " · swipe to see more" : ""}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 min-h-[140px] rounded-xl bg-violet-100/60 dark:bg-slate-700/50 animate-pulse" />
          ) : events.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl border border-dashed border-violet-200 dark:border-violet-800/50 bg-white/40 dark:bg-slate-900/30 px-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                {emptyMessage}
              </p>
            </div>
          ) : (
            <HorizontalEventScroller
              itemCount={events.length}
              activeDotClass="bg-violet-500"
              ariaLabel="Check-in times"
              columnSlide
            >
              {events.map((event) => {
                const checkInAt = getCheckInOpensAt(event);
                const countdown =
                  checkInAt && event.startTime
                    ? formatCheckInCountdown(checkInAt, event.startTime, nowMs)
                    : null;

                return (
                  <button
                    key={event._id}
                    type="button"
                    data-event-card
                    onClick={() => setSelectedEvent(event)}
                    className={COLUMN_CARD_CLASS}
                  >
                    {countdown && (
                      <span
                        className={`inline-flex items-center gap-1 self-start mb-2 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          countdown === "Open now"
                            ? "bg-green-600 text-white"
                            : "bg-violet-600 text-white"
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        {countdown}
                      </span>
                    )}
                    <p className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-violet-700 dark:group-hover:text-violet-300">
                      {event.name}
                    </p>
                    {checkInAt && (
                      <div className="flex items-center gap-1.5 mt-3 text-sm font-semibold text-violet-700 dark:text-violet-300">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>Check-in {formatEventDateTime(checkInAt)}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      Starts {formatEventDateTime(event.startTime)}
                    </p>
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

export default CheckInTimesSection;
