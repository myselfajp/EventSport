"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, ShieldCheck, Calendar, ChevronRight, Flag, Users } from "lucide-react";
import { EP } from "@/app/lib/endpoints";
import { fetchJSON } from "@/app/lib/api";
import { fetchLinkedEvents, type LinkedEvent } from "@/app/lib/linked-events";
import ViewEventModal from "@/components/event/ViewEventModal";
import GroupViewModal from "@/components/GroupViewModal";
import EntityFollowButton from "@/components/follow/EntityFollowButton";
import ReportModal from "@/components/report/ReportModal";
import { useMe } from "@/app/hooks/useAuth";

type ViewEventModalEvent = NonNullable<
  React.ComponentProps<typeof ViewEventModal>["event"]
>;

export type ClubViewModalClub = {
  _id: string;
  name: string;
  creator?: any;
  vision?: string;
  conditions?: string;
  coaches?: any[];
  photo?: { path: string };
  isApproved?: boolean;
  createdAt?: string;
};

interface ClubViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  club: ClubViewModalClub | null;
}

const ClubViewModal: React.FC<ClubViewModalProps> = ({
  isOpen,
  onClose,
  club,
}) => {
  const [clubEvents, setClubEvents] = useState<LinkedEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventsTotal, setEventsTotal] = useState(0);
  const [communities, setCommunities] = useState<any[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);
  const [communitiesError, setCommunitiesError] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<LinkedEvent | null>(null);
  const [isEventViewOpen, setIsEventViewOpen] = useState(false);
  const [selectedCommunity, setSelectedCommunity] = useState<any | null>(null);
  const [resolvedCoachNames, setResolvedCoachNames] = useState<Record<string, string>>({});
  const [showReportModal, setShowReportModal] = useState(false);
  const { data: currentUser } = useMe();

  const clubId = club?._id ? String(club._id) : "";

  const ownsClub =
    club?.creator &&
    currentUser?._id &&
    String(typeof club.creator === "object" ? club.creator._id : club.creator) === String(currentUser._id);

  const canReport = Boolean(currentUser && clubId && !ownsClub);

  const loadClubEvents = useCallback(async () => {
    if (!clubId) return;
    setEventsLoading(true);
    setEventsError("");
    const { events, total, error } = await fetchLinkedEvents("club", clubId);
    setClubEvents(events);
    setEventsTotal(total);
    if (error) setEventsError(error);
    setEventsLoading(false);
  }, [clubId]);

  const loadClubCommunities = useCallback(async () => {
    if (!clubId) return;
    setCommunitiesLoading(true);
    setCommunitiesError("");
    try {
      const url = EP.GROUP.getGroupByClub
        ? EP.GROUP.getGroupByClub(clubId)
        : `${EP.GROUP.getGroup}/${clubId}`;
      const res = await fetchJSON(url, {
        method: "POST",
        body: { pageNumber: 1, perPage: 50 },
      });
      if (res?.success && Array.isArray(res.data)) {
        setCommunities(res.data);
      } else {
        setCommunities([]);
      }
    } catch (err: any) {
      console.error("Error loading club communities:", err);
      setCommunitiesError("Failed to load communities.");
    } finally {
      setCommunitiesLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    if (isOpen && clubId) {
      void loadClubEvents();
      void loadClubCommunities();
    }
    if (!isOpen) {
      setClubEvents([]);
      setEventsError("");
      setEventsTotal(0);
      setCommunities([]);
      setCommunitiesError("");
      setSelectedEvent(null);
      setIsEventViewOpen(false);
    }
  }, [isOpen, clubId, loadClubEvents, loadClubCommunities]);

  useEffect(() => {
    const stringIds = (club?.coaches || [])
      .filter((c: any) => typeof c === "string" && /^[a-fA-F0-9]{24}$/.test(c)) as string[];
    if (stringIds.length === 0) return;

    Promise.all(
      stringIds.map(async (id) => {
        try {
          const res = await fetchJSON(EP.AUTH.getUserById(id), { method: "GET" });
          if (res?.success && res.data) {
            const name = [res.data.firstName, res.data.lastName].filter(Boolean).join(" ");
            return { id, name: name || res.data.email || "Coach" };
          }
        } catch { }
        return { id, name: "Coach" };
      })
    ).then((results) => {
      const map: Record<string, string> = {};
      results.forEach((r) => {
        if (r) map[r.id] = r.name;
      });
      setResolvedCoachNames((prev) => ({ ...prev, ...map }));
    });
  }, [club?.coaches]);

  if (!isOpen || !club) return null;

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

  const getDisplayName = (person: any, idx: number) => {
    if (!person) return `Coach ${idx + 1}`;
    if (typeof person === "object" && person !== null) {
      const fullName = [person.firstName, person.lastName].filter(Boolean).join(" ");
      return fullName || person.name || person.email || `Coach ${idx + 1}`;
    }
    if (typeof person === "string") {
      if (resolvedCoachNames[person]) return resolvedCoachNames[person];
      if (/^[a-fA-F0-9]{24}$/.test(person)) return `Coach ${idx + 1}`;
      return person;
    }
    return `Coach ${idx + 1}`;
  };

  const portalReady = typeof window !== "undefined" && !!document?.body;
  return portalReady ? createPortal(
    (
      <>
        {!isEventViewOpen && !selectedCommunity && (
          <div className="fixed inset-0 z-app-modal-nested flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    Club Details
                  </h2>
                  {club.isApproved && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Approved
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <EntityFollowButton type="club" entityId={clubId} />
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {club.photo?.path && (
                  <div className="flex justify-center">
                    <img
                      src={getImageUrl(club.photo.path)!}
                      alt={club.name}
                      className="h-48 w-full max-w-md object-cover rounded-lg border border-gray-200 dark:border-slate-700"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                      Club Name
                    </label>
                    <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                      {club.name}
                    </div>
                  </div>

                  {club.vision && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Vision
                      </label>
                      <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                        {club.vision}
                      </div>
                    </div>
                  )}

                  {club.conditions && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Conditions
                      </label>
                      <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200 whitespace-pre-wrap">
                        {club.conditions}
                      </div>
                    </div>
                  )}

                  {club.coaches && club.coaches.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Coaches
                      </label>
                      <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                        <div className="flex flex-wrap gap-1.5">
                          {club.coaches.map((c: any, idx: number) => {
                            const name = getDisplayName(c, idx);
                            return (
                              <span
                                key={c?._id || idx}
                                className="inline-flex items-center px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 text-xs font-medium"
                              >
                                {name}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {club.createdAt && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                        Created Date
                      </label>
                      <div className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-700 dark:text-slate-200">
                        {formatDate(club.createdAt)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Communities Section */}
                <div className="border-t dark:border-slate-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                    <Users className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    Communities in this club
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {communities.length > 0
                      ? `${communities.length} communit${communities.length === 1 ? "y" : "ies"}`
                      : "Sport communities attached to this club"}
                  </p>

                  {communitiesLoading ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-7 w-7 border-2 border-cyan-500 border-t-transparent" />
                    </div>
                  ) : communitiesError ? (
                    <p className="text-sm text-red-600 dark:text-red-400 py-3">{communitiesError}</p>
                  ) : communities.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                      No communities linked to this club yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {communities.map((comm) => (
                        <button
                          key={comm._id}
                          type="button"
                          onClick={() => setSelectedCommunity(comm)}
                          className="p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-700/50 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 hover:border-cyan-300 dark:hover:border-cyan-600 transition-all flex items-center gap-3 text-left w-full group cursor-pointer"
                        >
                          {comm.photo?.path ? (
                            <img
                              src={getImageUrl(comm.photo.path)!}
                              alt={comm.name}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 dark:border-slate-600 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-cyan-100 dark:bg-cyan-900/50 text-cyan-600 dark:text-cyan-300 flex items-center justify-center font-bold text-sm shrink-0">
                              {comm.name?.charAt(0) || "C"}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-cyan-600 dark:group-hover:text-cyan-400 flex items-center justify-between">
                              <span className="truncate">{comm.name}</span>
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                            </div>
                            {comm.description && (
                              <div className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">
                                {comm.description}
                              </div>
                            )}
                            {comm.coaches && comm.coaches.length > 0 && (
                              <div className="text-[11px] text-cyan-600 dark:text-cyan-400 mt-0.5">
                                {comm.coaches.length} coach{comm.coaches.length === 1 ? "" : "es"}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="border-t dark:border-slate-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    Events for this club
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {eventsTotal > 0
                      ? `${eventsTotal} event${eventsTotal === 1 ? "" : "s"} total`
                      : "All events linked to this club"}
                  </p>

                  {eventsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                    </div>
                  ) : eventsError ? (
                    <p className="text-sm text-red-600 dark:text-red-400 py-4">
                      {eventsError}
                    </p>
                  ) : clubEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                      No events for this club yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
                      {clubEvents.map((ev) => (
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

              <div className="p-6 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end gap-2">
                {canReport && (
                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="px-4 py-2.5 text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center gap-2 transition-colors"
                  >
                    <Flag className="w-4 h-4" />
                    Report
                  </button>
                )}
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
        )}

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
                club: { _id: club._id, name: club.name },
                createdAt: selectedEvent.createdAt || new Date().toISOString(),
              } as ViewEventModalEvent
            }
            onCoachClick={() => { }}
          />
        )}

        {canReport && (
          <ReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            targetType="club"
            targetId={clubId}
            targetLabel={club.name}
          />
        )}

        {selectedCommunity && (
          <GroupViewModal
            isOpen={Boolean(selectedCommunity)}
            onClose={() => setSelectedCommunity(null)}
            onBack={() => setSelectedCommunity(null)}
            backButtonText={`Back to ${club.name}`}
            group={selectedCommunity}
          />
        )}
      </>
    ), document.body) : null;
};

export default ClubViewModal;
