"use client";

import React, { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ViewEventModal from "@/components/event/ViewEventModal";
import HorizontalEventScroller from "@/components/dashboard/HorizontalEventScroller";
import EventCardTimes from "@/components/dashboard/EventCardTimes";
import type { CheckInEventRef } from "@/app/lib/event-dashboard-utils";

const MAX_NEARBY_EVENTS = 8;

type DistrictRef = { _id: string; name: string };

type NearbyEvent = CheckInEventRef & {
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
  className?: string;
};

const COLUMN_CARD_CLASS =
  "snap-center shrink-0 w-full min-w-full text-left p-4 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/40 hover:border-cyan-400 dark:hover:border-cyan-500 hover:shadow-md transition-all group";

const NearbyEventsSection: React.FC<NearbyEventsSectionProps> = ({
  districtId,
  districtName,
  onEventClick,
  className = "",
}) => {
  const [events, setEvents] = useState<NearbyEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<NearbyEvent | null>(null);

  useEffect(() => {
    if (!districtId) {
      setEvents([]);
      setLoading(false);
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

  return (
    <>
      <section
        className={`h-full flex flex-col rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-sm overflow-hidden min-w-0 ${className}`}
      >
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                Events Near You
              </h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                {districtName
                  ? `${districtName}, Istanbul${events.length > 1 ? " · swipe to see more" : ""}`
                  : "Set your district in profile"}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col min-h-0">
          {!districtId ? (
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl border border-dashed border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30 px-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                Add your district in profile to see nearby events.
              </p>
            </div>
          ) : loading ? (
            <div className="flex-1 min-h-[140px] rounded-xl bg-gray-100 dark:bg-slate-700 animate-pulse" />
          ) : events.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[140px] rounded-xl border border-dashed border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30 px-4">
              <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
                No upcoming events in your district yet.
              </p>
            </div>
          ) : (
            <HorizontalEventScroller
              itemCount={events.length}
              activeDotClass="bg-cyan-500"
              ariaLabel="Events near you"
              columnSlide
            >
              {events.map((event) => (
                <button
                  key={event._id}
                  type="button"
                  data-event-card
                  onClick={() => openEvent(event)}
                  className={COLUMN_CARD_CLASS}
                >
                  <p className="font-medium text-gray-900 dark:text-white line-clamp-2 group-hover:text-cyan-700 dark:group-hover:text-cyan-300">
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
                </button>
              ))}
            </HorizontalEventScroller>
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
