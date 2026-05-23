"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Users, Calendar, ChevronRight } from "lucide-react";
import { EP } from "@/app/lib/endpoints";
import { fetchLinkedEvents, type LinkedEvent } from "@/app/lib/linked-events";
import ViewEventModal from "@/components/event/ViewEventModal";

type ViewEventModalEvent = NonNullable<
  React.ComponentProps<typeof ViewEventModal>["event"]
>;

export type GroupViewModalGroup = {
  _id: string;
  name: string;
  description?: string;
  clubId?: string;
  clubName?: string;
  photo?: { path: string };
  isApproved?: boolean;
  createdAt?: string;
};

interface GroupViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: GroupViewModalGroup | null;
}

const GroupViewModal: React.FC<GroupViewModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [groupEvents, setGroupEvents] = useState<LinkedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventsTotal, setEventsTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<LinkedEvent | null>(null);
  const [isEventViewOpen, setIsEventViewOpen] = useState(false);

  const groupId = group?._id ? String(group._id) : "";

  const loadGroupEvents = useCallback(async () => {
    if (!groupId) return;
    setEventsLoading(true);
    setEventsError("");
    const { events, total, error } = await fetchLinkedEvents("group", groupId);
    setGroupEvents(events);
    setEventsTotal(total);
    if (error) setEventsError(error);
    setEventsLoading(false);
  }, [groupId]);

  useEffect(() => {
    if (isOpen && groupId) {
      void loadGroupEvents();
    }
    if (!isOpen) {
      setGroupEvents([]);
      setEventsError("");
      setEventsTotal(0);
      setSelectedEvent(null);
      setIsEventViewOpen(false);
    }
  }, [isOpen, groupId, loadGroupEvents]);

  if (!isOpen || !group) return null;

  const getImageUrl = (path?: string) => {
    if (!path) return null;
    return EP.assetUrl(path);
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(isoString));
  };

  const formatEventDateTime = (iso: string) => {
    if (!iso) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  };

  const openEvent = (ev: LinkedEvent) => {
    setSelectedEvent(ev);
    setIsEventViewOpen(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/60 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                Sport Community Details
              </h2>
              {group.isApproved && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-800">
                  <Users className="w-3.5 h-3.5" />
                  Approved
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {group.photo?.path && (
              <div className="flex justify-center">
                <img
                  src={getImageUrl(group.photo.path)!}
                  alt={group.name}
                  className="h-48 w-full max-w-md object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                />
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Sport Community Name
                </label>
                <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                  {group.name}
                </div>
              </div>

              {group.clubName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Club
                  </label>
                  <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                    {group.clubName}
                  </div>
                </div>
              )}

              {group.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Description
                  </label>
                  <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                    {group.description}
                  </div>
                </div>
              )}

              {group.createdAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Created Date
                  </label>
                  <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                    {formatDate(group.createdAt)}
                  </div>
                </div>
              )}
            </div>

            <div className="border-t dark:border-slate-700 pt-6">
              <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                Events for this community
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                {eventsTotal > 0
                  ? `${eventsTotal} event${eventsTotal === 1 ? "" : "s"} total`
                  : "All events linked to this sport community"}
              </p>

              {eventsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                </div>
              ) : eventsError ? (
                <p className="text-sm text-red-600 dark:text-red-400 py-4">
                  {eventsError}
                </p>
              ) : groupEvents.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                  No events for this community yet.
                </p>
              ) : (
                <ul className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
                  {groupEvents.map((ev) => (
                    <li key={ev._id}>
                      <button
                        type="button"
                        onClick={() => openEvent(ev)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: ev.eventStyle?.color || "#06b6d4",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {ev.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatEventDateTime(ev.startTime)}
                            {ev.sport?.name ? ` · ${ev.sport.name}` : ""}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {selectedEvent && (
        <ViewEventModal
          isOpen={isEventViewOpen}
          onClose={() => {
            setIsEventViewOpen(false);
            setSelectedEvent(null);
          }}
          event={
            {
              ...selectedEvent,
              group: { _id: group._id, name: group.name },
              createdAt: selectedEvent.createdAt || new Date().toISOString(),
            } as ViewEventModalEvent
          }
          onCoachClick={() => {}}
        />
      )}
    </>
  );
};

export default GroupViewModal;
