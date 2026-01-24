"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, X, Clock, Users, CheckCircle, CreditCard } from "lucide-react";
import { useMe } from "@/app/hooks/useAuth";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ViewEventModal from "./event/ViewEventModal";
import AddEventModal from "./event/AddEventModal";
import CoachDetailModal from "./CoachDetailModal";
import FacilityDetailsModal from "./profile/FacilityDetailsModal";
import { Facility } from "@/app/lib/types";

interface CoachCalendarProps {
  onBack: () => void;
}

interface Event {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  owner?: {
    _id: string;
  } | string;
  backupCoach?: {
    _id: string;
  } | string;
  eventStyle?: {
    name: string;
    color: string;
  };
  sport?: {
    _id: string;
    name: string;
  };
  sportGroup?: {
    _id: string;
    name: string;
  };
  [key: string]: any;
}

const CoachCalendar: React.FC<CoachCalendarProps> = ({ onBack }) => {
  const { data: user, isLoading: userLoading } = useMe();
  const coachId = user?._id; // User ID is used as owner for events
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [monthEvents, setMonthEvents] = useState<Event[]>([]);
  const [selectedDateEvents, setSelectedDateEvents] = useState<Event[]>([]);
  const [isLoadingMonthEvents, setIsLoadingMonthEvents] = useState(false);
  const [isLoadingDateEvents, setIsLoadingDateEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showViewEventModal, setShowViewEventModal] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedCoachId, setSelectedCoachId] = useState<string | null>(null);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showFacilityModal, setShowFacilityModal] = useState(false);
  
  // Participants modal state
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [selectedEventForParticipants, setSelectedEventForParticipants] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);

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

  // Get start and end of month
  const getMonthStartEnd = useCallback((date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const start = new Date(year, month, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, month + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, []);

  // Fetch events for the current month (for highlighting)
  const fetchMonthEvents = useCallback(async () => {
    if (!coachId || userLoading) return;
    
    setIsLoadingMonthEvents(true);
    try {
      const { start, end } = getMonthStartEnd(currentDate);
      
      const response = await fetchJSON(EP.EVENTS.getEvents, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
          sortBy: "startTime",
          sortType: "asc",
          // Don't filter by owner here, we'll filter in frontend to include backupCoach
        },
      });

      if (response?.success && response?.data) {
        // Filter events that belong to this coach (owner or backupCoach) and fall within the month range
        let allFilteredEvents = response.data.filter((event: Event) => {
          if (!event || !event.startTime) return false;
          
          // Check if coach is owner or backupCoach
          const ownerId = typeof event.owner === 'object' && event.owner !== null ? event.owner._id : event.owner;
          const backupCoachId = typeof event.backupCoach === 'object' && event.backupCoach !== null ? event.backupCoach._id : event.backupCoach;
          const isOwner = ownerId === coachId;
          const isBackupCoach = backupCoachId === coachId;
          if (!isOwner && !isBackupCoach) return false;
          
          const eventStart = new Date(event.startTime);
          const eventDate = new Date(
            eventStart.getFullYear(),
            eventStart.getMonth(),
            eventStart.getDate()
          );
          const startDate = new Date(
            start.getFullYear(),
            start.getMonth(),
            start.getDate()
          );
          const endDate = new Date(
            end.getFullYear(),
            end.getMonth(),
            end.getDate()
          );
          return eventDate >= startDate && eventDate <= endDate;
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
                const nextFiltered = nextResponse.data.filter((event: Event) => {
                  if (!event || !event.startTime) return false;
                  
                  // Check if coach is owner or backupCoach
                  const ownerId = typeof event.owner === 'object' && event.owner !== null ? event.owner._id : event.owner;
                  const backupCoachId = typeof event.backupCoach === 'object' && event.backupCoach !== null ? event.backupCoach._id : event.backupCoach;
                  const isOwner = ownerId === coachId;
                  const isBackupCoach = backupCoachId === coachId;
                  if (!isOwner && !isBackupCoach) return false;
                  
                  const eventStart = new Date(event.startTime);
                  const eventDate = new Date(
                    eventStart.getFullYear(),
                    eventStart.getMonth(),
                    eventStart.getDate()
                  );
                  const startDate = new Date(
                    start.getFullYear(),
                    start.getMonth(),
                    start.getDate()
                  );
                  const endDate = new Date(
                    end.getFullYear(),
                    end.getMonth(),
                    end.getDate()
                  );
                  return eventDate >= startDate && eventDate <= endDate;
                });
                allFilteredEvents = [...allFilteredEvents, ...nextFiltered];
              }
            } catch (err) {
              console.error(`Error fetching page ${page}:`, err);
              break;
            }
          }
        }
        
        setMonthEvents(allFilteredEvents);
      } else {
        setMonthEvents([]);
      }
    } catch (err) {
      console.error("Error fetching month events:", err);
      setMonthEvents([]);
    } finally {
      setIsLoadingMonthEvents(false);
    }
  }, [currentDate, coachId, userLoading, getMonthStartEnd]);

  // Fetch events for a specific date
  const fetchDateEvents = useCallback(async (date: Date) => {
    if (!coachId) return;
    
    setIsLoadingDateEvents(true);
    try {
      const response = await fetchJSON(EP.EVENTS.getEvents, {
        method: "POST",
        body: {
          perPage: 100,
          pageNumber: 1,
          sortBy: "startTime",
          sortType: "asc",
          // Don't filter by owner here, we'll filter in frontend to include backupCoach
        },
      });

      if (response?.success && response?.data) {
        // Filter events that belong to this coach (owner or backupCoach) and match the specific date
        const filteredEvents = response.data.filter((event: Event) => {
          if (!event || !event.startTime) return false;
          
          // Check if coach is owner or backupCoach
          const ownerId = typeof event.owner === 'object' && event.owner !== null ? event.owner._id : event.owner;
          const backupCoachId = typeof event.backupCoach === 'object' && event.backupCoach !== null ? event.backupCoach._id : event.backupCoach;
          const isOwner = ownerId === coachId;
          const isBackupCoach = backupCoachId === coachId;
          if (!isOwner && !isBackupCoach) return false;
          
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
                const nextFiltered = nextResponse.data.filter((event: Event) => {
                  if (!event || !event.startTime) return false;
                  
                  // Check if coach is owner or backupCoach
                  const ownerId = typeof event.owner === 'object' && event.owner !== null ? event.owner._id : event.owner;
                  const backupCoachId = typeof event.backupCoach === 'object' && event.backupCoach !== null ? event.backupCoach._id : event.backupCoach;
                  const isOwner = ownerId === coachId;
                  const isBackupCoach = backupCoachId === coachId;
                  if (!isOwner && !isBackupCoach) return false;
                  
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
      setIsLoadingDateEvents(false);
    }
  }, [coachId]);

  // Fetch month events when date changes
  useEffect(() => {
    if (coachId && !userLoading) {
      fetchMonthEvents();
    }
  }, [currentDate, coachId, userLoading, fetchMonthEvents]);

  // Get events for a specific day
  const getEventsForDay = useCallback((day: number) => {
    return monthEvents.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear()
      );
    });
  }, [monthEvents, currentDate]);

  // Check if a day has events
  const hasEvents = useCallback((day: number) => {
    return getEventsForDay(day).length > 0;
  }, [getEventsForDay]);

  const handleDateClick = (day: number) => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    setSelectedDate(date);
    setShowEventModal(true);
    fetchDateEvents(date);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    const prevMonthDays = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ).getDate();

    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="text-center py-2 text-gray-300 dark:text-slate-600 text-sm">
          {prevMonthDays - i}
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const hasEventsForDay = hasEvents(day);
      const isToday =
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      // Get unique colors from events
      const uniqueColors = Array.from(
        new Set(
          dayEvents
            .map((e) => e.eventStyle?.color || "#3b82f6")
            .filter((c) => c)
        )
      );

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(day)}
          className={`relative text-center py-4 rounded-lg transition-all border-2 min-h-[60px] flex flex-col justify-center cursor-pointer ${
            isToday
              ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500"
              : hasEventsForDay
              ? "bg-cyan-50 dark:bg-cyan-900/20 border-transparent hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700"
              : "border-transparent hover:bg-gray-50 dark:hover:bg-slate-700/50"
          }`}
        >
          <div
            className={`text-lg font-semibold mb-2 ${
              isToday
                ? "text-cyan-700 dark:text-cyan-400"
                : hasEventsForDay
                ? "text-gray-800 dark:text-white"
                : "text-gray-700 dark:text-slate-300"
            }`}
          >
            {day}
          </div>
          {hasEventsForDay && (
            <div className="flex flex-wrap gap-1 justify-center px-1">
              {uniqueColors.slice(0, 3).map((color, idx) => (
                <div
                  key={idx}
                  className="h-2 w-2 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                  title={dayEvents.find((e) => (e.eventStyle?.color || "#3b82f6") === color)?.name}
                />
              ))}
              {uniqueColors.length > 3 && (
                <div className="text-[8px] text-gray-600 dark:text-slate-300 font-semibold bg-gray-100 dark:bg-slate-700 px-1 rounded">
                  +{uniqueColors.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push(
        <div key={`next-${i}`} className="text-center py-2 text-gray-300 dark:text-slate-600 text-sm">
          {i}
        </div>
      );
    }

    return days;
  };

  // Calculate statistics
  const totalEvents = monthEvents.length;
  const eventTypes = monthEvents.reduce((acc, event) => {
    const type = event.eventStyle?.name || "Event";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const greenEvents = eventTypes["Training"] || 0;
  const redEvents = eventTypes["Meeting"] || 0;
  const blueEvents = totalEvents - greenEvents - redEvents;

  const greenPercentage = totalEvents > 0 ? Math.round((greenEvents / totalEvents) * 100) : 0;
  const redPercentage = totalEvents > 0 ? Math.round((redEvents / totalEvents) * 100) : 0;
  const bluePercentage = totalEvents > 0 ? Math.round((blueEvents / totalEvents) * 100) : 0;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchParticipants = async (eventId: string) => {
    setIsLoadingParticipants(true);
    try {
      const response = await fetchJSON(EP.COACH.getEventParticipants(eventId), {
        method: "POST",
        body: { perPage: 100, pageNumber: 1 },
      });
      if (response?.success && response?.data) {
        setParticipants(response.data);
      } else {
        setParticipants([]);
      }
    } catch (err) {
      console.error("Error fetching participants:", err);
      setParticipants([]);
    } finally {
      setIsLoadingParticipants(false);
    }
  };

  const handleShowParticipants = (e: React.MouseEvent, event: Event) => {
    e.stopPropagation();
    setSelectedEventForParticipants(event);
    setShowParticipantsModal(true);
    fetchParticipants(event._id);
  };

  const handleCloseParticipantsModal = () => {
    setShowParticipantsModal(false);
    setSelectedEventForParticipants(null);
    setParticipants([]);
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Back to Events"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">My Calendar</h2>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6">
        {/* Calendar Section */}
        <div className="flex-1 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() - 1);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
            <h3 className="font-semibold text-gray-800 dark:text-white text-xl">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h3>
            <button
              onClick={() => {
                const newDate = new Date(currentDate);
                newDate.setMonth(newDate.getMonth() + 1);
                setCurrentDate(newDate);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-slate-300" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-4">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-sm font-semibold text-gray-700 dark:text-slate-300 py-4 min-h-[40px] flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">{renderCalendar()}</div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-500 shadow-sm"></div>
                <span className="text-gray-600 dark:text-slate-300 font-medium">Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm"></div>
                <span className="text-gray-600 dark:text-slate-300 font-medium">Training</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500 shadow-sm"></div>
                <span className="text-gray-600 dark:text-slate-300 font-medium">Meeting</span>
              </div>
            </div>
          </div>
        </div>

        {/* Events Statistics Section */}
        <div className="lg:w-80 w-full bg-white dark:bg-slate-800 rounded-xl p-6 shadow-md border border-gray-100 dark:border-slate-700 flex flex-col justify-center">
          <div className="text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-4xl font-bold text-gray-800 dark:text-white">
                  {totalEvents}
                </span>
                <span className="text-sm text-cyan-600 dark:text-cyan-400 font-medium">
                  total
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                All Events This Month
              </p>
            </div>

            {totalEvents > 0 && (
              <div className="flex items-center justify-center gap-8 mb-8">
                <div className="relative w-32 h-32">
                  <svg
                    className="w-32 h-32 transform -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="15"
                      strokeDasharray={`${bluePercentage * 2.512} 251.2`}
                      strokeDashoffset="0"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="15"
                      strokeDasharray={`${greenPercentage * 2.512} 251.2`}
                      strokeDashoffset={`-${bluePercentage * 2.512}`}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="15"
                      strokeDasharray={`${redPercentage * 2.512} 251.2`}
                      strokeDashoffset={`-${(bluePercentage + greenPercentage) * 2.512}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg font-bold text-gray-700 dark:text-slate-200">{totalEvents}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-blue-500 text-xl">●</span>
                  <span className="text-gray-700 dark:text-slate-200 font-medium">Events</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white text-lg">{blueEvents} ({bluePercentage}%)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-green-500 text-xl">●</span>
                  <span className="text-gray-700 dark:text-slate-200 font-medium">Training</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white text-lg">{greenEvents} ({greenPercentage}%)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-red-500 text-xl">●</span>
                  <span className="text-gray-700 dark:text-slate-200 font-medium">Meetings</span>
                </div>
                <span className="font-bold text-gray-800 dark:text-white text-lg">{redEvents} ({redPercentage}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {showEventModal && selectedDate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}, {selectedDate.getFullYear()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {isLoadingDateEvents ? "Loading..." : `${selectedDateEvents.length} event${selectedDateEvents.length !== 1 ? "s" : ""} scheduled`}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedDate(null);
                  setSelectedDateEvents([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {isLoadingDateEvents ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-slate-400">Loading events...</p>
                </div>
              ) : selectedDateEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-300 dark:text-slate-600 mb-4">
                    <Clock className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-lg">No events scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => {
                    const ownerId = typeof event.owner === 'object' && event.owner !== null ? event.owner._id : event.owner;
                    const isOwner = ownerId === coachId;
                    
                    return (
                      <div
                        key={event._id}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowViewEventModal(true);
                        }}
                        className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-700/50 cursor-pointer"
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className="w-4 h-4 rounded-full mt-2 flex-shrink-0"
                            style={{
                              backgroundColor: event.eventStyle?.color || "#3b82f6",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="font-semibold text-gray-800 dark:text-white text-lg mb-1">
                                  {event.name}
                                </h4>
                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-3">
                                  <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                  <span className="font-medium">
                                    {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                  </span>
                                </div>
                                {event.sport && (
                                  <p className="text-sm text-gray-500 dark:text-slate-400 mb-1">
                                    Sport: {event.sport.name}
                                  </p>
                                )}
                                {event.sportGroup && (
                                  <p className="text-sm text-gray-500 dark:text-slate-400">
                                    Sport Group: {event.sportGroup.name}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {event.eventStyle && (
                                  <span
                                    className="text-xs px-3 py-1 rounded-full font-medium"
                                    style={{
                                      backgroundColor: `${event.eventStyle.color}20`,
                                      color: event.eventStyle.color,
                                    }}
                                  >
                                    {event.eventStyle.name}
                                  </span>
                                )}
                                <button
                                  onClick={(e) => handleShowParticipants(e, event)}
                                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-lg text-xs font-medium transition-colors flex items-center gap-1"
                                  title="View Participants"
                                >
                                  <Users className="w-3 h-3" />
                                  Participants
                                </button>
                                {isOwner && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedEvent(event);
                                      setShowEditEventModal(true);
                                      setShowEventModal(false); // Close the day events modal
                                    }}
                                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <ViewEventModal
          isOpen={showViewEventModal}
          onClose={() => {
            setShowViewEventModal(false);
            setSelectedEvent(null);
          }}
          event={{
            ...selectedEvent,
            createdAt: selectedEvent.createdAt || new Date().toISOString(),
          }}
          onCoachClick={(coachId: string) => {
            if (coachId) {
              setSelectedCoachId(coachId);
              setShowCoachModal(true);
            }
          }}
          onFacilityClick={(facility) => {
            if (facility) {
              setSelectedFacility(facility as Facility);
              setShowFacilityModal(true);
            }
          }}
        />
      )}

      <AddEventModal
        isOpen={showEditEventModal}
        onClose={() => {
          setShowEditEventModal(false);
          setSelectedEvent(null);
        }}
        onSuccess={() => {
          // Refresh events for the selected date if modal is open
          if (selectedDate) {
            fetchDateEvents(selectedDate);
          }
          fetchMonthEvents(); // Refresh month events too
          setSelectedEvent(null);
        }}
        initialData={showEditEventModal ? selectedEvent : undefined}
      />

      <CoachDetailModal
        isOpen={showCoachModal}
        onClose={() => {
          setShowCoachModal(false);
          setSelectedCoachId(null);
        }}
        coachId={selectedCoachId}
      />

      <FacilityDetailsModal
        isOpen={showFacilityModal}
        onClose={() => {
          setShowFacilityModal(false);
          setSelectedFacility(null);
        }}
        facility={selectedFacility}
      />

      {/* Participants Modal */}
      {showParticipantsModal && selectedEventForParticipants && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-[60] p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Event Participants
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {selectedEventForParticipants.name}
                </p>
              </div>
              <button
                onClick={handleCloseParticipantsModal}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {isLoadingParticipants ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : participants.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No participants yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((p: any) => (
                    <div
                      key={p._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-900 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {p.user?.firstName?.[0] || "?"}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {p.user?.firstName} {p.user?.lastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-slate-400">
                            {p.participant?.name || "Participant"}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.isCheckedIn ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Checked In
                          </span>
                        ) : p.isPaid ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-medium">
                            <CreditCard className="w-3 h-3" />
                            Paid
                          </span>
                        ) : p.isWaitListed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Waitlisted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
                <span>Total: {participants.length} participants</span>
                <span>
                  Checked In: {participants.filter((p: any) => p.isCheckedIn).length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachCalendar;
