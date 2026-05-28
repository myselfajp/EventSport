"use client";

import React, { useEffect, useState } from "react";
import { MapPin, Calendar } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ViewEventModal from "@/components/event/ViewEventModal";

const MAX_NEARBY_EVENTS = 8;

type DistrictRef = { _id: string; name: string };

type NearbyEvent = {
  _id: string;
  name: string;
  startTime: string;
  type: string;
  district?: DistrictRef | string;
  sport?: { name?: string };
  facility?: { name?: string };
};

type NearbyEventsSectionProps = {
  districtId?: string | null;
  districtName?: string | null;
  onEventClick?: (eventId: string) => void;
};

function formatEventDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const NearbyEventsSection: React.FC<NearbyEventsSectionProps> = ({
  districtId,
  districtName,
  onEventClick,
}) => {
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NearbyEvent | null>(null);

  useEffect(() => {
    if (!districtId) {
      setEvents([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchJSON(EP.EVENTS.getEvents, {
          method: "POST",
          body: {
            district: districtId,
            perPage: 20,
            pageNumber: 1,
            sortBy: "startTime",
            sortType: "asc",
            private: false,
          },
        });

        if (cancelled) return;

        const now = Date.now();
        const upcoming = (res?.data ?? []).filter(
          (e: NearbyEvent) =>
            e.type !== "Online" &&
            e.startTime &&
            new Date(e.startTime).getTime() > now
        );
        setEvents(upcoming.slice(0, MAX_NEARBY_EVENTS));
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  const openEvent = (event: NearbyEvent) => {
    if (onEventClick) {
      onEventClick(event._id);
      return;
    }
    setSelectedEvent(event);
  };

  if (!districtId) return null;

  return (
    <>
      <section className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                Events Near You
              </h2>
              {districtName && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-400 truncate">
                  {districtName}, Istanbul · swipe to see more
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex gap-3 overflow-hidden">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="shrink-0 w-64 h-28 rounded-xl bg-gray-100 dark:bg-slate-700 animate-pulse"
                />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-6">
              No upcoming events in your district yet.
            </p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory scrollbar-thin">
              {events.map((event) => (
                <button
                  key={event._id}
                  type="button"
                  onClick={() => openEvent(event)}
                  className="snap-start shrink-0 w-64 sm:w-72 text-left p-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md transition-all group"
                >
                  <p className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
                    {event.name}
                  </p>
                  {event.sport?.name && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                      {event.sport.name}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 dark:text-slate-300">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span>{formatEventDate(event.startTime)}</span>
                  </div>
                  {event.facility?.name && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 truncate">
                      {event.facility.name}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {!onEventClick && (
        <ViewEventModal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          event={
            selectedEvent
              ? ({
                  ...selectedEvent,
                  createdAt:
                    (selectedEvent as { createdAt?: string }).createdAt ||
                    new Date().toISOString(),
                } as React.ComponentProps<typeof ViewEventModal>["event"])
              : null
          }
          onCoachClick={() => {}}
        />
      )}
    </>
  );
};

export default NearbyEventsSection;
