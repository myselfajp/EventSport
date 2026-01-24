"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Menu, Calendar, Zap, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import Header from "./Header";
import EventsTable from "./event/EventsTable";
import CoachCalendar from "./CoachCalendar";
import FollowingsView from "./follow/FollowingsView";
import FavoritesView from "./favorite/FavoritesView";
import SportsBanner from "./SportsBanner";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";

const EventsDashboard = () => {
  const router = useRouter();
  const { data: user } = useMe();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("all");
  const [calendarView, setCalendarView] = useState("month");
  const [showCoachCalendar, setShowCoachCalendar] = useState(false);
  const [showFollowings, setShowFollowings] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);

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
      // Determine which endpoint to use based on activeTab
      let endpoint = EP.EVENTS.getEvents;
      if (activeTab === "my") {
        endpoint = EP.PARTICIPANT.myReservations;
      } else if (activeTab === "created") {
        endpoint = EP.COACH.myCreatedEvents;
      }
      
      const payload: any = {
        perPage: pagination.perPage,
        pageNumber: pagination.currentPage,
      };

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
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <LeftSidebar
        isOpen={leftSidebarOpen}
        onShowCalendar={() => {
          setShowFollowings(false);
          setShowFavorites(false);
          setShowCoachCalendar(true);
          setLeftSidebarOpen(false);
        }}
        onShowFollowings={() => {
          setShowCoachCalendar(false);
          setShowFavorites(false);
          setShowFollowings(true);
          setLeftSidebarOpen(false);
        }}
        onShowFavorites={() => {
          setShowCoachCalendar(false);
          setShowFollowings(false);
          setShowFavorites(true);
          setLeftSidebarOpen(false);
        }}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header
          onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 space-y-6">
            {/* Welcome Banner */}
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl p-6 sm:p-8 overflow-hidden">
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500/10 to-pink-500/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

              {/* Grid pattern */}
              <div
                className="absolute inset-0 opacity-5"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                }}
              />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="px-3 py-1 bg-cyan-500/20 rounded-full">
                    <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                      Dashboard
                    </span>
                  </div>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-3 tracking-tight">
                  Welcome back, {user?.firstName || "User"}!
                </h1>
                <p className="text-slate-400 text-base sm:text-lg max-w-xl mb-6">
                  Your sports platform is thriving. Here's a quick overview
                  of today's activity and upcoming events.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5">
                    <Zap className="w-4 h-4" />
                    Create Event
                  </button>
                  {user?.role === 0 && (
                    <button
                      onClick={() => router.push("/admin-panel")}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:-translate-y-0.5"
                    >
                      <Settings className="w-4 h-4" />
                      Admin Panel
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sports Banner - Below banner - Only show on events page */}
            {!showCoachCalendar && !showFollowings && !showFavorites && (
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
                />
              )}
            </div>
          </div>
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
    </div>
  );
};

export default EventsDashboard;
