"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X,
  Clock,
} from "lucide-react";
import AddEventModal from "./event/AddEventModal";
import { useMe } from "@/app/hooks/useAuth";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface RightSidebarProps {
  isOpen: boolean;
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  calendarView: string;
  setCalendarView: (view: string) => void;
  events: any[];
  onEventCreated?: () => void;
}

const RightSidebar: React.FC<RightSidebarProps> = ({
  isOpen,
  currentDate,
  setCurrentDate,
  calendarView,
  setCalendarView,
  events,
  onEventCreated,
}) => {
  const { data: user, isLoading: userLoading } = useMe();
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const isCoach = user?.coach != null;
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedDateEvents, setSelectedDateEvents] = useState<any[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Set currentDate to today on mount if not already set
  useEffect(() => {
    const today = new Date();
    const currentDateOnly = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate.getDate()
    );
    const todayOnly = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (currentDateOnly.getTime() !== todayOnly.getTime()) {
      setCurrentDate(today);
      setSelectedYear(today.getFullYear());
      setSelectedMonth(today.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch events for a specific date
  const fetchDateEvents = useCallback(async (date: Date) => {
    setIsLoadingEvents(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const response = await fetchJSON(EP.EVENTS.getEvents, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
          sortBy: "startTime",
          sortType: "asc",
        },
      });

      if (response?.success && response?.data) {
        // Filter events for the specific date
        const filteredEvents = response.data.filter((event: any) => {
          if (!event || !event.startTime) return false;
          const eventStart = new Date(event.startTime);
          return (
            eventStart.getDate() === date.getDate() &&
            eventStart.getMonth() === date.getMonth() &&
            eventStart.getFullYear() === date.getFullYear()
          );
        });

        // If there are more pages, fetch them
        if (response.pagination && response.pagination.totalPages > 1) {
          for (let page = 2; page <= response.pagination.totalPages; page++) {
            try {
              const nextResponse = await fetchJSON(EP.EVENTS.getEvents, {
                method: "POST",
                body: {
                  perPage: 100,
                  pageNumber: page,
                  sortBy: "startTime",
                  sortType: "asc",
                },
              });

              if (nextResponse?.success && nextResponse?.data) {
                const nextFiltered = nextResponse.data.filter((event: any) => {
                  if (!event || !event.startTime) return false;
                  const eventStart = new Date(event.startTime);
                  return (
                    eventStart.getDate() === date.getDate() &&
                    eventStart.getMonth() === date.getMonth() &&
                    eventStart.getFullYear() === date.getFullYear()
                  );
                });
                filteredEvents.push(...nextFiltered);
              }
            } catch (err) {
              console.error(`Error fetching page ${page}:`, err);
              break;
            }
          }
        }

        setSelectedDateEvents(filteredEvents);
      } else {
        setSelectedDateEvents([]);
      }
    } catch (err) {
      console.error("Error fetching date events:", err);
      setSelectedDateEvents([]);
    } finally {
      setIsLoadingEvents(false);
    }
  }, []);

  // Get days of the month
  const getMonthDays = useCallback(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: (Date | null)[] = [];

    // Add previous month's days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(null); // We'll handle these separately in render
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    // Add next month's days to fill the grid (42 cells total)
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(null);
    }

    return { days, startingDayOfWeek, daysInMonth, prevMonthDays };
  }, [currentDate]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setShowEventModal(true);
    // Fetch events for the selected date
    fetchDateEvents(date);
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedYear(today.getFullYear());
    setSelectedMonth(today.getMonth());
  };

  const handleYearMonthChange = () => {
    const newDate = new Date(
      selectedYear,
      selectedMonth,
      currentDate.getDate()
    );
    setCurrentDate(newDate);
  };

  const monthDaysData = getMonthDays();

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`${
        isOpen ? "w-full sm:w-96 md:w-[400px]" : "w-0"
      } bg-white dark:bg-slate-900 border-l border-gray-200 dark:border-slate-700 transition-all duration-300 overflow-hidden flex-shrink-0 h-screen overflow-y-auto`}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800 dark:text-slate-100 text-lg">
            Dashboard
          </h3>
          {userLoading ? (
            <div className="w-28 h-10 bg-gray-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
          ) : isCoach ? (
            <button
              onClick={() => setIsAddEventModalOpen(true)}
              className="bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white px-3 py-2 rounded-lg flex items-center gap-2 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </button>
          ) : null}
        </div>

        <div className="mb-4">
          {/* Calendar */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
            {/* Year and Month Selectors */}
            <div className="flex items-center gap-2 mb-3">
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(Number(e.target.value));
                }}
                onBlur={handleYearMonthChange}
                className="px-2 py-1 rounded text-xs bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-600"
              >
                {Array.from(
                  { length: 10 },
                  (_, i) => new Date().getFullYear() - 5 + i
                ).map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                }}
                onBlur={handleYearMonthChange}
                className="px-2 py-1 rounded text-xs bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-100 border border-gray-200 dark:border-slate-600 flex-1"
              >
                {monthNames.map((month, index) => (
                  <option key={index} value={index}>
                    {month}
                  </option>
                ))}
              </select>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                  setSelectedYear(newDate.getFullYear());
                  setSelectedMonth(newDate.getMonth());
                }}
                className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-700 dark:text-slate-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h4 className="font-semibold text-gray-800 dark:text-slate-100 text-sm">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h4>
              <button
                onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                  setSelectedYear(newDate.getFullYear());
                  setSelectedMonth(newDate.getMonth());
                }}
                className="p-0.5 hover:bg-white dark:hover:bg-slate-700 rounded text-gray-700 dark:text-slate-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-1.5 mb-3">
              <button
                onClick={handleToday}
                className="ml-auto px-2 py-0.5 rounded text-xs hover:bg-white dark:hover:bg-slate-700 text-gray-600 dark:text-slate-400 transition-colors"
              >
                Today
              </button>
            </div>

            {/* Month Calendar */}
            <div className="grid grid-cols-7 gap-0.5 mb-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-sm font-semibold text-gray-700 dark:text-slate-300 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {monthDaysData.days.map((day, index) => {
                if (day === null) {
                  // Previous or next month day
                  const isPrevMonth = index < monthDaysData.startingDayOfWeek;
                  const dayNumber = isPrevMonth
                    ? monthDaysData.prevMonthDays -
                      (monthDaysData.startingDayOfWeek - index - 1)
                    : index -
                      monthDaysData.startingDayOfWeek -
                      monthDaysData.daysInMonth +
                      1;
                  return (
                    <div
                      key={index}
                      className="text-center py-2 text-gray-300 dark:text-slate-600 text-xs"
                    >
                      {dayNumber}
                    </div>
                  );
                }

                const isToday =
                  day.toDateString() === new Date().toDateString();

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(day)}
                    className={`relative text-center py-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded cursor-pointer transition-colors ${
                      isToday ? "ring-2 ring-cyan-500" : ""
                    }`}
                  >
                    <div
                      className={`text-base font-semibold ${
                        isToday
                          ? "text-cyan-600 dark:text-cyan-400 font-bold"
                          : "text-gray-700 dark:text-slate-300"
                      }`}
                    >
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Earnings Card (Coach Only) */}
        {isCoach && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-md border border-gray-100 dark:border-slate-700">
            <div className="mb-4">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-3xl font-bold text-gray-800 dark:text-slate-100">
                  $69,700
                </span>
                <span className="text-sm text-lime-400 font-medium">
                  monthly
                </span>
              </div>
              <p className="text-sm text-orange-300 dark:text-orange-400">
                Projects Earnings in April
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg
                  className="w-24 h-24 transform -rotate-90"
                  viewBox="0 0 100 100"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="20"
                    strokeDasharray="75.4 251.2"
                    strokeDashoffset="0"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#84cc16"
                    strokeWidth="20"
                    strokeDasharray="50.3 251.2"
                    strokeDashoffset="-75.4"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="#a78bfa"
                    strokeWidth="20"
                    strokeDasharray="125.5 251.2"
                    strokeDashoffset="-125.7"
                  />
                </svg>
              </div>

              <div className="flex-1 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-slate-400">-</span>
                    <span className="text-gray-600 dark:text-slate-300">
                      Leaf CRM
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-slate-100">
                    $7,660
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-slate-400">-</span>
                    <span className="text-gray-600 dark:text-slate-300">
                      Marketing
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-slate-100">
                    $16,783
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 dark:text-slate-400">-</span>
                    <span className="text-gray-600 dark:text-slate-300">
                      Others
                    </span>
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-slate-100">
                    $45,257
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onSuccess={() => {
          // Refresh events for the selected date if modal is open
          if (selectedDate) {
            fetchDateEvents(selectedDate);
          }
          if (onEventCreated) {
            onEventCreated();
          }
        }}
      />

      {/* Detail View Modal */}
      {showEventModal && selectedDate && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-100">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}
                  , {selectedDate.getFullYear()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {selectedDateEvents.length} event
                  {selectedDateEvents.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedDate(null);
                  setSelectedDateEvents([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-300 dark:text-slate-600 mb-4">
                    <Calendar className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-lg mb-4">
                    No events scheduled for this day
                  </p>
                  {isCoach && (
                    <button
                      onClick={() => {
                        setShowEventModal(false);
                        setSelectedDate(null);
                        setSelectedDateEvents([]);
                        setIsAddEventModalOpen(true);
                      }}
                      className="bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Add Event
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event, idx) => (
                    <div
                      key={event._id || idx}
                      className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md dark:hover:shadow-lg transition-shadow bg-white dark:bg-slate-800/50"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className="w-4 h-4 rounded-full mt-2 flex-shrink-0"
                          style={{
                            backgroundColor:
                              event.eventStyle?.color || "#3b82f6",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-800 dark:text-slate-100 text-lg mb-1">
                                {event.name}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400 mb-3">
                                <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                <span className="font-medium">
                                  {formatTime(event.startTime)} -{" "}
                                  {formatTime(event.endTime)}
                                </span>
                              </div>
                            </div>
                            <span className="inline-block px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-full text-xs font-medium">
                              {event.sport?.name || "Event"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightSidebar;
