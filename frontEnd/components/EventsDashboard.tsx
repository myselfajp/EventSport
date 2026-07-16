"use client";

import React, { useState, useEffect, useCallback } from "react";
import { GamerProfilePromptProvider } from "@/app/contexts/GamerProfilePromptContext";
import { X, Menu, Calendar, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import Header from "./Header";
import EventsTable from "./event/EventsTable";
import CoachCalendar from "./CoachCalendar";
import FollowingsView from "./follow/FollowingsView";
import FavoritesView from "./favorite/FavoritesView";
import ActivityView from "./activity/ActivityView";
import SportsBanner from "./SportsBanner";
import StaticPageView from "./StaticPageView";
import AddEventModal from "./event/AddEventModal";
import SiteFooter from "./SiteFooter";
import PageHeroBanner from "./PageHeroBanner";
import NearbyEventsSection from "./NearbyEventsSection";
import YourNextEventSection from "./YourNextEventSection";
import HotUpcomingSection from "./HotUpcomingSection";
import CheckInTimesSection from "./dashboard/CheckInTimesSection";
import NotificationEventLinkHandler from "./notification/NotificationEventLinkHandler";
import ServiceRequestsPanel from "./service-requests/ServiceRequestsPanel";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  clearLoginUrlParam,
  clearServiceRequestsUrlParam,
  readLoginFromUrl,
  readServiceRequestsTabFromUrl,
} from "@/app/lib/service-request-url";

const EventsDashboard = () => {
  const router = useRouter();
  const { data: user, isPending: isUserPending } = useMe();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [calendarView, setCalendarView] = useState("month");
  const [showCoachCalendar, setShowCoachCalendar] = useState(false);
  const [showFollowings, setShowFollowings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [selectedStaticPageName, setSelectedStaticPageName] = useState<string | null>(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [gamerProfileOpenSignal, setGamerProfileOpenSignal] = useState(0);
  const [serviceRequestsPreferredTab, setServiceRequestsPreferredTab] = useState<
    "mine" | "incoming" | null
  >(null);
  const [coachMePanelOpen, setCoachMePanelOpen] = useState(false);
  const [coachMeAutoWizard, setCoachMeAutoWizard] = useState(false);
  const openGamerProfile = useCallback(() => {
    setLeftSidebarOpen(true);
    setGamerProfileOpenSignal((n) => n + 1);
  }, []);

  const openCoachMe = useCallback(
    (tab: "mine" | "incoming" = "mine", autoWizard = tab === "mine") => {
      setServiceRequestsPreferredTab(tab);
      setCoachMeAutoWizard(autoWizard);
      setCoachMePanelOpen(true);
    },
    []
  );

  const openServiceRequests = useCallback((tab: "mine" | "incoming" = "mine") => {
    openCoachMe(tab);
  }, [openCoachMe]);

  useEffect(() => {
    const initialTab = readServiceRequestsTabFromUrl();
    if (initialTab) {
      openServiceRequests(initialTab);
      clearServiceRequestsUrlParam();
    }

    if (readLoginFromUrl() && !isUserPending && !user) {
      setLeftSidebarOpen(true);
      clearLoginUrlParam();
    }

    const coachMeHandler = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: "mine" | "incoming"; autoWizard?: boolean }>).detail;
      const tab = detail?.tab || "mine";
      openCoachMe(tab, detail?.autoWizard ?? tab === "mine");
      clearServiceRequestsUrlParam();
    };

    const loginHandler = () => {
      if (!user) setLeftSidebarOpen(true);
    };

    window.addEventListener("eventsport:open-coach-me", coachMeHandler);
    window.addEventListener("eventsport:open-service-requests", coachMeHandler);
    window.addEventListener("eventsport:open-login", loginHandler);
    return () => {
      window.removeEventListener("eventsport:open-coach-me", coachMeHandler);
      window.removeEventListener("eventsport:open-service-requests", coachMeHandler);
      window.removeEventListener("eventsport:open-login", loginHandler);
    };
  }, [openCoachMe, openServiceRequests, user, isUserPending]);
  const isCoach = user?.coach != null;
  const canManageEvents = isCoach || user?.role === 0;

  const userLocation = user?.location as
    | {
        country?: string;
        state?: string;
        city?: string;
        district?: string | { _id?: string; name?: string };
        districtName?: string;
        locationKey?: string;
      }
    | undefined;
  const userDistrict = userLocation?.district;
  const userDistrictDocName =
    typeof userDistrict === "object" && userDistrict?.name
      ? String(userDistrict.name)
      : null;
  const userLocationKey = userLocation?.locationKey || null;
  const userLocationLabel = (() => {
    if (!userLocation) return null;
    const country = String(userLocation.country || "TR").toUpperCase();
    if (country === "US") {
      return (
        [userLocation.city, userLocation.state].filter(Boolean).join(", ") ||
        null
      );
    }
    const district = userLocation.districtName || userDistrictDocName;
    return [district, userLocation.city].filter(Boolean).join(", ") || district;
  })();

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0,
    perPage: 10,
  });

  const [filters, setFilters] = useState({
    search: "",
    sortBy: undefined as string | undefined,
    sortType: "asc" as "asc" | "desc",
    private: false,
    sport: undefined as string | undefined,
  });

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (isUserPending) {
        setIsLoading(true);
        return;
      }

      if (activeTab === "my" && !user?.coach && user?.role !== 0) {
        setEvents([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          totalPages: 1,
        }));
        setIsLoading(false);
        return;
      }

      if (
        (activeTab === "registered" || activeTab === "participated") &&
        !user?.participant
      ) {
        setEvents([]);
        setPagination((prev) => ({
          ...prev,
          total: 0,
          totalPages: 1,
        }));
        setIsLoading(false);
        return;
      }

      // Determine which endpoint to use based on activeTab
      let endpoint = EP.EVENTS.getEvents;
      if (activeTab === "my") {
        endpoint = EP.COACH.myCreatedEvents;
      } else if (activeTab === "registered" || activeTab === "participated") {
        endpoint = EP.PARTICIPANT.myReservations;
      }

      const payload: any = {
        perPage: pagination.perPage,
        pageNumber: pagination.currentPage,
      };

      if (activeTab === "registered" || activeTab === "participated") {
        payload.reservationScope = activeTab;
      }

      // Only apply filters for "all" tab
      if (activeTab === "all") {
        if (filters.search && filters.search.length >= 2) {
          payload.search = filters.search;
        }

        if (filters.sortBy) {
          payload.sortBy = filters.sortBy;
          payload.sortType = filters.sortType;
        }

        payload.private = filters.private;

        if (filters.sport) {
          payload.sport = filters.sport;
        }
      }

      const response = await fetchJSON(endpoint, {
        method: "POST",
        body: payload,
      });

      if (response?.success && response?.data) {
        setEvents(response.data);
        if (response.pagination) {
          setPagination({
            currentPage: response.pagination.currentPage || 1,
            totalPages: response.pagination.totalPages || 1,
            total: response.pagination.total || 0,
            perPage: response.pagination.perPage || 10,
          });
        }
      } else {
        setError(response?.message || "Failed to load events");
        setEvents([]);
      }
    } catch (err) {
      setError("An error occurred while fetching events");
      setEvents([]);
      console.error("Error fetching events:", err);
    } finally {
      setIsLoading(false);
    }
  }, [
    activeTab,
    pagination.currentPage,
    pagination.perPage,
    filters.search,
    filters.sortBy,
    filters.sortType,
    filters.private,
    filters.sport,
    user?.coach,
    user?.role,
    user?.participant,
    isUserPending,
  ]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  // Reset pagination when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handleSearchChange = (search: string) => {
    setFilters((prev) => ({ ...prev, search }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSortChange = (sortBy: string, sortType: "asc" | "desc") => {
    setFilters((prev) => ({ ...prev, sortBy, sortType }));
  };

  const handlePrivateToggle = (isPrivate: boolean) => {
    setFilters((prev) => ({ ...prev, private: isPrivate }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  const handleSportFilter = (sportId: string | null) => {
    setFilters((prev) => ({ ...prev, sport: sportId || undefined }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  return (
    <GamerProfilePromptProvider openGamerProfile={openGamerProfile}>
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <LeftSidebar
        isOpen={leftSidebarOpen}
        gamerProfileOpenSignal={gamerProfileOpenSignal}
        onShowFollowings={() => {
          setShowCoachCalendar(false);
          setShowFavorites(false);
          setShowActivity(false);
          setShowFollowings(true);
          setLeftSidebarOpen(false);
        }}
        onShowFavorites={() => {
          setShowCoachCalendar(false);
          setShowFollowings(false);
          setShowActivity(false);
          setShowFavorites(true);
          setLeftSidebarOpen(false);
        }}
        onShowActivity={() => {
          setShowCoachCalendar(false);
          setShowFollowings(false);
          setShowFavorites(false);
          setShowActivity(true);
          setLeftSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <Header
          onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {user?.role === 0 && (
              <div className="flex justify-end -mb-2">
                <button
                  type="button"
                  onClick={() => router.push("/admin-panel")}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Admin Panel
                </button>
              </div>
            )}
            <PageHeroBanner context="home" useFallback />

            {user &&
              !showCoachCalendar &&
              !showFollowings &&
              !showFavorites &&
              !showActivity &&
              !selectedStaticPageName && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch">
                    <YourNextEventSection />
                    <NearbyEventsSection
                      locationKey={userLocationKey}
                      locationLabel={userLocationLabel}
                    />
                    <HotUpcomingSection />
                    <CheckInTimesSection />
                  </div>
                </div>
              )}

            {!showCoachCalendar &&
              !showFollowings &&
              !showFavorites &&
              !showActivity && (
              <SportsBanner
                selectedSportId={filters.sport}
                onSportClick={handleSportFilter}
              />
            )}

            {/* Events Section */}
            <div>
              {showCoachCalendar ? (
                <CoachCalendar onBack={() => setShowCoachCalendar(false)} />
              ) : showFollowings ? (
                <FollowingsView onBack={() => setShowFollowings(false)} />
              ) : showFavorites ? (
                <FavoritesView onBack={() => setShowFavorites(false)} />
              ) : showActivity ? (
                <ActivityView onBack={() => setShowActivity(false)} />
              ) : selectedStaticPageName ? (
                <StaticPageView
                  pageName={selectedStaticPageName}
                  onBack={() => setSelectedStaticPageName(null)}
                />
              ) : (
                <EventsTable
                  events={events}
                  isLoading={isLoading}
                  error={error}
                  activeTab={activeTab}
                  setActiveTab={handleTabChange}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                  onSearchChange={handleSearchChange}
                  onSortChange={handleSortChange}
                  onPrivateToggle={handlePrivateToggle}
                  isPrivateFilter={filters.private}
                  onCreateEventClick={
                    canManageEvents ? () => setIsAddEventModalOpen(true) : undefined
                  }
                  onEventsChanged={fetchEvents}
                />
              )}
            </div>
          </div>
          <SiteFooter />
        </div>
      </div>

      <RightSidebar
        isOpen={rightSidebarOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        events={events}
        onEventCreated={fetchEvents}
      />

      {/* Anasayfadan Create Event akışı: koçlar için tab başlığındaki butona bağlı modal. */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onSuccess={() => {
          setIsAddEventModalOpen(false);
          fetchEvents();
        }}
      />

      <ServiceRequestsPanel
        isOpen={coachMePanelOpen}
        onClose={() => {
          setCoachMePanelOpen(false);
          setCoachMeAutoWizard(false);
          clearServiceRequestsUrlParam();
        }}
        hasGamerProfile={!!user?.participant}
        isProvider={!!user?.coach || !!user?.performanceMember}
        preferredTab={serviceRequestsPreferredTab}
        autoStartWizard={coachMeAutoWizard}
      />

      {/* Mobile Toggle - Left Sidebar */}
      <button
        onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
        className="fixed bottom-6 left-6 lg:hidden bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-full shadow-lg shadow-cyan-500/30 z-50 hover:shadow-cyan-500/50 transition-all duration-200 hover:scale-105"
        aria-label={leftSidebarOpen ? "Close menu" : "Open menu"}
      >
        {leftSidebarOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Mobile Toggle - Right Sidebar */}
      <button
        onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
        className="fixed bottom-6 right-6 lg:hidden bg-gradient-to-r from-cyan-500 to-blue-500 text-white p-3 rounded-full shadow-lg shadow-cyan-500/30 z-50 hover:shadow-cyan-500/50 transition-all duration-200 hover:scale-105"
        aria-label={rightSidebarOpen ? "Close calendar" : "Open calendar"}
      >
        {rightSidebarOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Calendar className="w-6 h-6" />
        )}
      </button>
      <NotificationEventLinkHandler />
    </div>
    </GamerProfilePromptProvider>
  );
};

export default EventsDashboard;
