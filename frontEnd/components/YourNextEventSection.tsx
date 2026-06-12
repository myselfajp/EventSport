"use client";

import React, { useEffect, useState } from "react";
import { Calendar, CalendarCheck, Clock } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import {
  formatCountdownToStart,
  formatEventDateTime,
} from "@/app/lib/event-dashboard-utils";
import {
  fetchUserDashboardEvents,
  getDashboardUserMode,
  getYourNextEmptyMessage,
  pickNextDashboardEvent,
  type DashboardEvent,
} from "@/app/lib/dashboard-event-sources";
import ViewEventModal from "@/components/event/ViewEventModal";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";
import EventCardThumbnail from "@/components/dashboard/EventCardThumbnail";

type YourNextEventSectionProps = {
  className?: string;
};

const YourNextEventSection: React.FC<YourNextEventSectionProps> = ({
  className = "",
}) => {
  const { data: user, isPending } = useMe();
  const [event, setEvent] = useState<DashboardEvent | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [emptyMessage, setEmptyMessage] = useState(
    "You haven't joined any upcoming event."
  );

  useEffect(() => {
    if (isPending || !user) {
      setEvent(null);
      return;
    }

    const mode = getDashboardUserMode(user);
    setEmptyMessage(getYourNextEmptyMessage(mode));

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const all = await fetchUserDashboardEvents(user);
        if (!cancelled) setEvent(pickNextDashboardEvent(all));
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

  const mode = getDashboardUserMode(user);
  const subtitle =
    mode === "gamer"
      ? "Your next joined event"
      : "Your next joined or hosted event";

  return (
    <>
      <section
        className={`h-full flex flex-col rounded-2xl border border-cyan-200 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50 to-white dark:from-cyan-950/40 dark:to-slate-800/80 shadow-sm overflow-hidden min-w-0 ${className}`}
      >
        <div className="px-4 py-3 border-b border-cyan-100 dark:border-cyan-900/50 shrink-0">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                Your Next Event
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 min-h-[140px] rounded-xl bg-white/60 dark:bg-slate-700/50 animate-pulse" />
          ) : event ? (
            <button
              type="button"
              onClick={() => setViewOpen(true)}
              className="flex-1 w-full text-left group flex flex-row gap-3 items-start p-4 rounded-xl bg-white/80 dark:bg-slate-900/50 border border-cyan-100 dark:border-cyan-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md transition-all min-h-[140px]"
            >
              <div className="flex-1 min-w-0 flex flex-col">
                {countdown && (
                  <div className="flex items-center gap-1.5 self-start mb-2 px-2.5 py-1 rounded-full bg-cyan-600 text-white text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Starts in {countdown}
                  </div>
                )}
                <p className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                  {event.name}
                </p>
                {event.sport?.name && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                    {event.sport.name}
                  </p>
                )}
                <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-600 dark:text-slate-300">
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Starts {formatEventDateTime(event.startTime)}</span>
                </div>
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
          ) : (
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl border border-dashed border-cyan-200 dark:border-cyan-800/50 bg-white/40 dark:bg-slate-900/30 px-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                {emptyMessage}
              </p>
            </div>
          )}
        </div>
      </section>

      <ViewEventModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        event={event as React.ComponentProps<typeof ViewEventModal>["event"]}
        onCoachClick={onCoachClick}
      />
      {coachProfileModal}
    </>
  );
};

export default YourNextEventSection;
