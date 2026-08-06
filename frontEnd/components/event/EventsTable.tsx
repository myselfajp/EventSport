"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Heart,
  Users,
  X,
  Plus,
} from "lucide-react";
import ViewEventModal from "./ViewEventModal";
import EventParticipantsModal from "./EventParticipantsModal";
import CoachDetailModal from "../CoachDetailModal";
import FacilityDetailsModal from "../profile/FacilityDetailsModal";
import ClubViewModal, { type ClubViewModalClub } from "../ClubViewModal";
import GroupViewModal, { type GroupViewModalGroup } from "../GroupViewModal";
import { Facility } from "@/app/lib/types";
import { EP } from "@/app/lib/endpoints";
import {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  isFavorited,
  defaultFavorites,
} from "@/app/hooks/useFavorites";
import { useMe } from "@/app/hooks/useAuth";
import GamerProfileRequiredBanner from "@/components/GamerProfileRequiredBanner";
import { ATHLETE_LABELS } from "@/app/lib/athlete-labels";

interface Event {
  _id: string;
  name: string;
  photo?: {
    path?: string;
  };
  sportGroup?: {
    _id: string;
    name: string;
  };
  sport?: {
    _id: string;
    name: string;
  };
  group?: {
    _id: string;
    name: string;
  };
  city?: string;
  districtName?: string;
  district?: string | { _id?: string; name?: string };
  state?: string;
  country?: string;
  eventStyle?: {
    name: string;
    color: string;
  };
  owner?: {
    _id: string;
    firstName: string;
    lastName: string;
    coach: string;
  };
  backupCoach?: {
    _id: string;
    firstName: string;
    lastName: string;
    coach: string;
  };
  backuoCoach?: {
    // Handling potential typo from backend
    _id: string;
    firstName: string;
    lastName: string;
    coach: string;
  };
  startTime: string;
  endTime: string;
  createdAt: string;
  [key: string]: any;
}

interface EventsTableProps {
  events: Event[];
  isLoading: boolean;
  error: string | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pagination: {
    currentPage: number;
    totalPages: number;
    total: number;
    perPage: number;
  };
  onPageChange: (page: number) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sortBy: string, sortType: "asc" | "desc") => void;
  onPrivateToggle: (isPrivate: boolean) => void;
  isPrivateFilter: boolean;
  onCreateEventClick?: () => void;
  onEventsChanged?: () => void;
}

const EventsTable: React.FC<EventsTableProps> = ({
  events,
  isLoading,
  error,
  activeTab,
  setActiveTab,
  pagination,
  onPageChange,
  onSearchChange,
  onSortChange,
  onPrivateToggle,
  isPrivateFilter,
  onCreateEventClick,
  onEventsChanged,
}) => {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );

  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [isCoachModalOpen, setIsCoachModalOpen] = useState(false);
  
  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [isFacilityModalOpen, setIsFacilityModalOpen] = useState(false);
  const [selectedClub, setSelectedClub] = useState<ClubViewModalClub | null>(null);
  const [isClubModalOpen, setIsClubModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<GroupViewModalGroup | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const { data: user } = useMe();
  const { data: favoritesData } = useFavorites();
  const favorites = favoritesData?.data || defaultFavorites;
  const { mutateAsync: addFavoriteAsync, isPending: isSavingFavorite } =
    useAddFavorite();
  const { mutateAsync: removeFavoriteAsync, isPending: isRemovingFavorite } =
    useRemoveFavorite();
  const canFavorite = !!user?.participant;
  const canSeeMyEvents = !!user?.coach || user?.role === 0;
  const canCreateOrManageEvents = !!user?.coach || user?.role === 0;
  const [favoriteAnimatingId, setFavoriteAnimatingId] = useState<string | null>(
    null
  );


  const [sortState, setSortState] = useState<{
    field: string | null;
    direction: "asc" | "desc";
  }>({
    field: null,
    direction: "asc",
  });

  const sortableFields: Record<string, string> = {
    name: "name",
    startTime: "startTime",
    endTime: "endTime",
  };


  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsViewModalOpen(true);
  };

  const handleFavoriteEvent = async (e: React.MouseEvent, eventItem: Event) => {
    e.stopPropagation();
    if (!eventItem?._id) return;
    if (!canFavorite) {
      alert(ATHLETE_LABELS.createProfileToLike);
      return;
    }
    const animKey = `event-${eventItem._id}`;
    const alreadyFav = isFavorited(favorites, "event", eventItem._id);
    setFavoriteAnimatingId(animKey);
    try {
      if (alreadyFav) {
        await removeFavoriteAsync({ type: "event", id: eventItem._id });
      } else {
        await addFavoriteAsync({
          type: "event",
          id: eventItem._id,
          entity: eventItem,
        });
      }
    } finally {
      setTimeout(() => {
        setFavoriteAnimatingId((curr) => (curr === animKey ? null : curr));
      }, 350);
    }
  };

  const handleCloseViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedEvent(null);
  };

  const handleShowParticipants = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setSelectedEventForParticipants(event);
    setIsParticipantsModalOpen(true);
  };

  const handleCloseParticipantsModal = () => {
    setIsParticipantsModalOpen(false);
    setSelectedEventForParticipants(null);
  };

  const handleCoachClick = (e: React.MouseEvent, coachId: string) => {
    e.stopPropagation(); // Prevent row click
    setSelectedCoachId(coachId);
    setIsCoachModalOpen(true);
  };

  const handleCloseCoachModal = () => {
    setIsCoachModalOpen(false);
    setSelectedCoachId(null);
  };

  const handleCloseFacilityModal = () => {
    setIsFacilityModalOpen(false);
    setSelectedFacility(null);
  };

  const handleCloseClubModal = () => {
    setIsClubModalOpen(false);
    setSelectedClub(null);
  };

  const handleCloseGroupModal = () => {
    setIsGroupModalOpen(false);
    setSelectedGroup(null);
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      onPageChange(page);
    }
  };

  const handleSearchInput = (value: string) => {
    setSearchValue(value);

    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      onSearchChange(value);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleSort = (field: string) => {
    const apiField = sortableFields[field];
    if (!apiField) return;

    let newDirection: "asc" | "desc" = "asc";

    if (sortState.field === field) {
      newDirection = sortState.direction === "asc" ? "desc" : "asc";
    }

    setSortState({ field, direction: newDirection });
    onSortChange(apiField, newDirection);
  };

  const getSortIcon = (field: string) => {
    if (sortState.field !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    }
    return sortState.direction === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1" />
    );
  };

  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const formatDate = (isoString: string) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    const dateStr = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    }).format(date);
    const timeStr = new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
    return `${dateStr} - ${timeStr}`;
  };

  const getImageUrl = (photo?: { path?: string }) => {
    if (photo?.path) {
      return EP.assetUrl(photo.path);
    }
    return "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop";
  };

  const getPageNumbers = () => {
    const pages = [];
    const { currentPage, totalPages } = pagination;
    const showEllipsisStart = currentPage > 3;
    const showEllipsisEnd = currentPage < totalPages - 2;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (showEllipsisStart) {
        pages.push(1);
        pages.push("...");
      } else {
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
      }

      const start = showEllipsisStart ? currentPage - 1 : 4;
      const end = showEllipsisEnd ? currentPage + 1 : totalPages - 2;

      for (let i = start; i <= end; i++) {
        if (i > 0 && i <= totalPages && !pages.includes(i)) {
          pages.push(i);
        }
      }

      if (showEllipsisEnd) {
        pages.push("...");
        pages.push(totalPages);
      } else {
        for (let i = totalPages - 2; i <= totalPages; i++) {
          if (!pages.includes(i)) {
            pages.push(i);
          }
        }
      }
    }

    return pages;
  };

  const startIndex = (pagination.currentPage - 1) * pagination.perPage;
  const endIndex = Math.min(startIndex + pagination.perPage, pagination.total);

  const needsGamerProfile = !!user && !user.participant;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md dark:shadow-lg border border-gray-100 dark:border-slate-700 p-6 transition-colors">
      {needsGamerProfile && activeTab === "all" && (
        <GamerProfileRequiredBanner className="mb-5" />
      )}
      {/* Tab bar, search, filters, and create — single row */}
      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4 mb-6 border-b border-gray-200 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "all"
                ? "text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            }`}
          >
            All {activeTab === "all" ? `(${pagination.total})` : ""}
          </button>
          <button
            onClick={() => canSeeMyEvents && setActiveTab("my")}
            disabled={!canSeeMyEvents}
            className={`pb-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "my"
                ? "text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            } ${!canSeeMyEvents ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
            title={
              !canSeeMyEvents
                ? "Coach profile or admin required — events you create appear here"
                : undefined
            }
          >
            My {activeTab === "my" ? `(${pagination.total})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("registered")}
            disabled={!user?.participant}
            className={`pb-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "registered"
                ? "text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            } ${!user?.participant ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
            title={
              !user?.participant
                ? ATHLETE_LABELS.createProfileToRegistered
                : undefined
            }
          >
            Registered{" "}
            {activeTab === "registered" ? `(${pagination.total})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("participated")}
            disabled={!user?.participant}
            className={`pb-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              activeTab === "participated"
                ? "text-cyan-600 dark:text-cyan-400 border-b-2 border-cyan-600 dark:border-cyan-400"
                : "text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
            } ${!user?.participant ? "opacity-40 cursor-not-allowed hover:text-gray-500" : ""}`}
            title={
              !user?.participant
                ? ATHLETE_LABELS.createProfileToParticipated
                : undefined
            }
          >
            Participated{" "}
            {activeTab === "participated" ? `(${pagination.total})` : ""}
          </button>
        </div>

        {activeTab === "all" ? (
          <>
            <div className="relative flex-1 min-w-[140px] basis-[12rem]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 w-4 h-4" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchValue}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg 
                           bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100
                           placeholder:text-gray-400 dark:placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400
                           transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap">
                Private
              </span>
              <button
                type="button"
                onClick={() => onPrivateToggle(!isPrivateFilter)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  isPrivateFilter
                    ? "bg-cyan-500 dark:bg-cyan-600"
                    : "bg-gray-300 dark:bg-slate-600"
                }`}
                aria-label="Filter private events"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isPrivateFilter ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 min-w-0" aria-hidden />
        )}

        {canCreateOrManageEvents && onCreateEventClick && (
          <button
            type="button"
            onClick={onCreateEventClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-md shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:-translate-y-0.5 text-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            Create Event
          </button>
        )}
      </div>

      {/* Table Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500 dark:text-red-400">{error}</p>
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-slate-400">
            {activeTab === "my" && !canSeeMyEvents
              ? "Add a coach profile (or sign in as admin) to list events you create."
              : (activeTab === "registered" || activeTab === "participated") &&
                  !user?.participant
                ? ATHLETE_LABELS.createProfileToSeeEvents
                : "No events found"}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/80 text-left">
                  <th className="pb-4 pt-4 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <button
                      onClick={() => handleSort("name")}
                      className="flex items-center hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      Event Name
                      {getSortIcon("name")}
                    </button>
                  </th>
                  <th className="pb-4 pt-4 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    <button
                      onClick={() => handleSort("startTime")}
                      className="flex items-center hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      Start Time
                      {getSortIcon("startTime")}
                    </button>
                  </th>
                  <th className="pb-4 pt-4 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                    City / District
                  </th>
                  <th className="pb-4 pt-4 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Sport
                  </th>
                  <th className="pb-4 pt-4 px-4 text-sm font-semibold text-gray-700 dark:text-slate-300">
                    Community
                  </th>
                  <th className="pb-4 pt-4 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {events.map((event, index) => (
                  <tr
                    key={event._id}
                    onClick={() => handleEventClick(event)}
                    title={
                      needsGamerProfile
                        ? ATHLETE_LABELS.createProfileToJoinPanel
                        : undefined
                    }
                    className={`border-b border-gray-100 dark:border-slate-700/50 
                               hover:bg-cyan-50/50 dark:hover:bg-cyan-900/10 
                               cursor-pointer transition-all duration-200 relative group ${
                                 index % 2 === 0
                                   ? "bg-white dark:bg-slate-800"
                                   : "bg-gray-50/50 dark:bg-slate-800/50"
                               }`}
                    style={{
                      borderLeft: event.eventStyle?.color
                        ? `4px solid ${event.eventStyle.color}`
                        : "4px solid transparent",
                    }}
                  >
                    <td className="py-5 px-4">
                      <div className="flex items-center gap-4">
                        <img
                          src={getImageUrl(event.photo)}
                          alt={event.name}
                          className="w-14 h-14 rounded-xl object-cover shadow-sm border border-gray-200 dark:border-slate-600"
                        />
                        <div>
                          <div className="font-semibold text-gray-800 dark:text-slate-100 mb-1">
                            {event.name || "NO-NAME"}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            Created {formatDate(event.createdAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 text-gray-700 dark:text-slate-300 font-medium whitespace-nowrap">
                      {formatDate(event.startTime)}
                    </td>
                    <td className="py-5 px-4 text-sm text-gray-700 dark:text-slate-300">
                      {(() => {
                        const city = event.city?.trim() || "";
                        const district =
                          event.districtName?.trim() ||
                          (typeof event.district === "object" &&
                          event.district?.name
                            ? String(event.district.name)
                            : "") ||
                          "";
                        if (city && district) return `${city} / ${district}`;
                        return city || district || "—";
                      })()}
                    </td>
                    <td className="py-5 px-4 text-sm text-gray-700 dark:text-slate-300">
                      {event.sport?.name || "—"}
                    </td>
                    <td className="py-5 px-4 text-sm text-gray-700 dark:text-slate-300">
                      {event.group?.name || "—"}
                    </td>
                    <td className="py-5 px-4">
                      <div className="flex items-center justify-end gap-2">
                        {/* Show participants button for created events tab */}
                        {activeTab === "my" && canCreateOrManageEvents && (
                          <button
                            onClick={(e) => handleShowParticipants(e, event)}
                            className="p-2 rounded-full border border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/40 transition-colors text-blue-500 dark:text-blue-400 flex items-center gap-1"
                            title={ATHLETE_LABELS.viewParticipants}
                          >
                            <Users className="w-4 h-4" />
                            {(event as any).participantCount !== undefined && (
                              <span className="text-xs font-medium">
                                {(event as any).participantCount}
                              </span>
                            )}
                          </button>
                        )}
                        <button
                          aria-label={
                            isFavorited(favorites, "event", event._id)
                              ? "Unlike"
                              : "Like event"
                          }
                          onClick={(e) => handleFavoriteEvent(e, event)}
                          disabled={
                            !canFavorite ||
                            isSavingFavorite ||
                            isRemovingFavorite
                          }
                          className={`p-2 rounded-full border border-transparent hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors transition-transform ${
                            isFavorited(favorites, "event", event._id)
                              ? "text-red-500"
                              : "text-gray-400 dark:text-slate-500"
                          } ${
                            !canFavorite
                              ? "cursor-not-allowed opacity-60"
                              : favoriteAnimatingId === `event-${event._id}`
                              ? "scale-110"
                              : ""
                          }`}
                        >
                          <Heart
                            className="w-4 h-4"
                            fill={
                              isFavorited(favorites, "event", event._id)
                                ? "currentColor"
                                : "none"
                            }
                          />
                        </button>
                        <button className="text-gray-400 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors text-lg font-bold">
                          →
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-200 dark:border-slate-700 pt-5">
              <div className="text-sm text-gray-600 dark:text-slate-400 font-medium">
                Showing{" "}
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  {startIndex + 1}
                </span>{" "}
                to{" "}
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  {endIndex}
                </span>{" "}
                of{" "}
                <span className="text-cyan-600 dark:text-cyan-400 font-semibold">
                  {pagination.total}
                </span>{" "}
                entries
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 
                             hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-300 dark:hover:border-cyan-700
                             disabled:opacity-50 disabled:cursor-not-allowed 
                             text-gray-700 dark:text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="hidden sm:flex items-center gap-1.5">
                  {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                      {page === "..." ? (
                        <span className="px-3 py-1.5 text-gray-500 dark:text-slate-400">
                          ...
                        </span>
                      ) : (
                        <button
                          onClick={() => goToPage(page as number)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                            pagination.currentPage === page
                              ? "bg-cyan-500 dark:bg-cyan-600 text-white shadow-md"
                              : "border border-gray-300 dark:border-slate-600 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-300 dark:hover:border-cyan-700 text-gray-700 dark:text-slate-300"
                          }`}
                        >
                          {page}
                        </button>
                      )}
                    </React.Fragment>
                  ))}
                </div>

                <div className="sm:hidden flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  Page {pagination.currentPage} of {pagination.totalPages}
                </div>

                <button
                  onClick={() => goToPage(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-2.5 rounded-lg border border-gray-300 dark:border-slate-600 
                             hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:border-cyan-300 dark:hover:border-cyan-700
                             disabled:opacity-50 disabled:cursor-not-allowed 
                             text-gray-700 dark:text-slate-300 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      <ViewEventModal
        isOpen={isViewModalOpen}
        onClose={handleCloseViewModal}
        event={selectedEvent}
        onEventUpdated={onEventsChanged}
        onCoachClick={(coachId) => {
          setSelectedCoachId(coachId);
          setIsCoachModalOpen(true);
        }}
        onFacilityClick={(facility) => {
          if (facility) {
            setSelectedFacility(facility as Facility);
            setIsFacilityModalOpen(true);
          }
        }}
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

      <CoachDetailModal
        isOpen={isCoachModalOpen}
        onClose={handleCloseCoachModal}
        coachId={selectedCoachId}
      />

      <FacilityDetailsModal
        isOpen={isFacilityModalOpen}
        onClose={handleCloseFacilityModal}
        facility={selectedFacility}
      />

      <ClubViewModal
        isOpen={isClubModalOpen}
        onClose={handleCloseClubModal}
        club={selectedClub}
      />

      <GroupViewModal
        isOpen={isGroupModalOpen}
        onClose={handleCloseGroupModal}
        group={selectedGroup}
      />

      <EventParticipantsModal
        isOpen={isParticipantsModalOpen}
        onClose={handleCloseParticipantsModal}
        eventId={selectedEventForParticipants?._id ?? null}
        eventName={selectedEventForParticipants?.name}
      />
    </div>
  );
};

export default EventsTable;
