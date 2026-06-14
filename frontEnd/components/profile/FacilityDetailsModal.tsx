"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  X,
  Home,
  Phone,
  Mail,
  MapPin,
  Star,
  Award,
  Calendar,
  ChevronRight,
  Flag,
} from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { Facility, SportResponse } from "@/app/lib/types";
import ViewEventModal from "@/components/event/ViewEventModal";
import ClubViewModal, { type ClubViewModalClub } from "@/components/ClubViewModal";
import GroupViewModal, { type GroupViewModalGroup } from "@/components/GroupViewModal";
import EntityFollowButton from "@/components/follow/EntityFollowButton";
import ReportModal from "@/components/report/ReportModal";
import { useMe } from "@/app/hooks/useAuth";

type ViewEventModalEvent = NonNullable<
  React.ComponentProps<typeof ViewEventModal>["event"]
>;

type FacilityEvent = {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  createdAt?: string;
  sport?: { _id?: string; name?: string };
  sportGroup?: { _id?: string; name?: string };
  eventStyle?: { name?: string; color?: string };
  facility?: Facility;
  owner?: { _id?: string; firstName?: string; lastName?: string; coach?: string };
};

interface FacilityDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  facility: Facility | null;
}

const FacilityDetailsModal: React.FC<FacilityDetailsModalProps> = ({
  isOpen,
  onClose,
  facility,
}) => {
  const [sportName, setSportName] = useState<string>("");
  const [isLoadingSport, setIsLoadingSport] = useState(false);
  const [facilityEvents, setFacilityEvents] = useState<FacilityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventsTotal, setEventsTotal] = useState(0);
  const [selectedEvent, setSelectedEvent] = useState<FacilityEvent | null>(null);
  const [isEventViewOpen, setIsEventViewOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubViewModalClub | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModalGroup | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const { data: currentUser } = useMe();

  const facilityId = facility?._id ? String(facility._id) : "";

  const ownsFacility =
    facilityId &&
    Array.isArray(currentUser?.facility) &&
    currentUser.facility.some((entry: { _id?: string } | string) => {
      const id = typeof entry === "string" ? entry : entry?._id;
      return id && String(id) === facilityId;
    });

  const canReport = Boolean(currentUser && facilityId && !ownsFacility);

  useEffect(() => {
    if (isOpen && facility?.mainSport) {
      void fetchSportName(facility.mainSport);
    }
    if (!isOpen) {
      setSportName("");
      setFacilityEvents([]);
      setEventsError("");
      setEventsTotal(0);
      setSelectedEvent(null);
      setIsEventViewOpen(false);
      setSelectedClub(null);
      setIsClubModalOpen(false);
      setSelectedGroup(null);
      setIsGroupModalOpen(false);
    }
  }, [isOpen, facility?.mainSport]);

  const loadFacilityEvents = useCallback(async () => {
    if (!facilityId) return;
    try {
      setEventsLoading(true);
      setEventsError("");
      const all: FacilityEvent[] = [];
      let page = 1;
      let totalPages = 1;
      const perPage = 50;

      do {
        const response = await fetchJSON(EP.EVENTS.getEvents, {
          method: "POST",
          body: {
            facility: facilityId,
            perPage,
            pageNumber: page,
            sortBy: "startTime",
            sortType: "desc",
          },
        });

        if (!response?.success) {
          const empty =
            page === 1 &&
            (response?.message === "No results found" ||
              String(response?.message || "").toLowerCase().includes("no results"));
          if (empty) {
            setFacilityEvents([]);
            setEventsTotal(0);
            return;
          }
          setEventsError(response?.message || response?.error || "Failed to load events");
          setFacilityEvents([]);
          setEventsTotal(0);
          return;
        }

        const batch = Array.isArray(response.data) ? (response.data as FacilityEvent[]) : [];
        all.push(...batch);
        setEventsTotal(response.pagination?.total ?? all.length);
        totalPages = response.pagination?.totalPages ?? 1;
        page += 1;
      } while (page <= totalPages && page <= 20);

      setFacilityEvents(all);
    } catch (err: unknown) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events");
      setFacilityEvents([]);
      setEventsTotal(0);
    } finally {
      setEventsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    if (isOpen && facilityId) {
      void loadFacilityEvents();
    }
  }, [isOpen, facilityId, loadFacilityEvents]);

  const fetchSportName = async (sportId: string | unknown) => {
    setIsLoadingSport(true);
    try {
      const actualSportId =
        typeof sportId === "string" ? sportId : (sportId as { _id?: string })?._id || sportId;

      const response: SportResponse = await fetchJSON(EP.REFERENCE.sport.get, {
        method: "POST",
        body: { sport: actualSportId },
      });

      if (response?.success && response?.data && response.data.length > 0) {
        setSportName(response.data[0].name);
      } else {
        setSportName(String(actualSportId));
      }
    } catch (err) {
      console.error("Error loading sport:", err);
      const actualSportId =
        typeof sportId === "string" ? sportId : (sportId as { _id?: string })?._id || sportId;
      setSportName(String(actualSportId));
    } finally {
      setIsLoadingSport(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US");
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

  const openEvent = (ev: FacilityEvent) => {
    setSelectedEvent(ev);
    setIsEventViewOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Facility Details
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 dark:bg-gray-800">
            {facility ? (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center shrink-0">
                    {facility.photo ? (
                      <img
                        src={
                          typeof facility.photo === "string"
                            ? facility.photo
                            : EP.assetUrl((facility.photo as { path?: string }).path)
                        }
                        alt={facility.name}
                        className="w-20 h-20 rounded-full object-cover"
                      />
                    ) : (
                      <Home className="w-10 h-10 text-green-600 dark:text-green-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {facility.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">Sports Facility</p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Added {formatDate(facility.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <EntityFollowButton type="facility" entityId={facilityId} />
                      {canReport && (
                        <button
                          type="button"
                          onClick={() => setShowReportModal(true)}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg transition-colors"
                        >
                          <Flag className="w-4 h-4" />
                          Report
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                      <p className="font-medium dark:text-white">{facility.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                      <p className="font-medium dark:text-white break-all">{facility.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg md:col-span-2">
                    <MapPin className="w-5 h-5 text-gray-500 dark:text-gray-400 shrink-0" />
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Address</p>
                      <p className="font-medium dark:text-white">{facility.address}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Facility Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Main Sport</p>
                        <p className="font-medium dark:text-white">
                          {isLoadingSport ? "Loading..." : sportName || facility.mainSport}
                        </p>
                      </div>
                    </div>
                    {facility.membershipLevel && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <Award className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Membership Level
                          </p>
                          <p className="font-medium dark:text-white">
                            {facility.membershipLevel}
                          </p>
                        </div>
                      </div>
                    )}
                    {facility.point !== null && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                        <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Rating</p>
                          <p className="font-medium dark:text-white">{facility.point}/10</p>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                      <Home className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Type</p>
                        <p className="font-medium dark:text-white">
                          {facility.private ? "Private" : "Public"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t dark:border-gray-700 pt-6">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                    Events at this facility
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    {eventsTotal > 0
                      ? `${eventsTotal} event${eventsTotal === 1 ? "" : "s"} total`
                      : "All events linked to this venue"}
                  </p>

                  {eventsLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
                    </div>
                  ) : eventsError ? (
                    <p className="text-sm text-red-600 dark:text-red-400 py-4">{eventsError}</p>
                  ) : facilityEvents.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center rounded-lg border border-dashed border-gray-200 dark:border-gray-600">
                      No events at this facility yet.
                    </p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-600 divide-y divide-gray-100 dark:divide-gray-700">
                      {facilityEvents.map((ev) => (
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
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
              </div>
            )}
          </div>

          <div className="flex-shrink-0 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end dark:bg-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
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
              facility: facility
                ? {
                    ...facility,
                    membershipLevel: facility.membershipLevel ?? undefined,
                    point: facility.point ?? undefined,
                  }
                : undefined,
              createdAt: selectedEvent.createdAt || new Date().toISOString(),
            } as ViewEventModalEvent
          }
          onCoachClick={() => {}}
          onFacilityClick={() => {}}
          onClubClick={(club) => {
            if (club?._id && club?.name) {
              setSelectedClub({ _id: club._id, name: club.name });
              setIsClubModalOpen(true);
            }
          }}
          onGroupClick={(group) => {
            if (group?._id && group?.name) {
              setSelectedGroup({ _id: group._id, name: group.name });
              setIsGroupModalOpen(true);
            }
          }}
        />
      )}

      <ClubViewModal
        isOpen={isClubModalOpen}
        onClose={() => {
          setIsClubModalOpen(false);
          setSelectedClub(null);
        }}
        club={selectedClub}
      />

      <GroupViewModal
        isOpen={isGroupModalOpen}
        onClose={() => {
          setIsGroupModalOpen(false);
          setSelectedGroup(null);
        }}
        group={selectedGroup}
      />

      {canReport && (
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          targetType="facility"
          targetId={facilityId}
          targetLabel={facility?.name}
        />
      )}
    </>
  );
};

export default FacilityDetailsModal;
