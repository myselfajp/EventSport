"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, X, Clock } from "lucide-react";

interface CoachCalendarProps {
  onBack: () => void;
}

interface CalendarEvent {
  id: number;
  title: string;
  date: Date;
  time: string;
  type: "event" | "training" | "meeting";
  color: string;
  borderColor: string;
  textColor: string;
}

const CoachCalendar: React.FC<CoachCalendarProps> = ({ onBack }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);

  const eventColors = [
    { bg: "bg-blue-500", border: "border-blue-500", text: "text-blue-700", label: "Event" },
    { bg: "bg-green-500", border: "border-green-500", text: "text-green-700", label: "Training" },
    { bg: "bg-purple-500", border: "border-purple-500", text: "text-purple-700", label: "Meeting" },
    { bg: "bg-cyan-500", border: "border-cyan-500", text: "text-cyan-700", label: "Event" },
    { bg: "bg-orange-500", border: "border-orange-500", text: "text-orange-700", label: "Training" },
    { bg: "bg-red-500", border: "border-red-500", text: "text-red-700", label: "Event" },
    { bg: "bg-pink-500", border: "border-pink-500", text: "text-pink-700", label: "Meeting" },
    { bg: "bg-yellow-500", border: "border-yellow-500", text: "text-yellow-700", label: "Event" },
    { bg: "bg-indigo-500", border: "border-indigo-500", text: "text-indigo-700", label: "Training" },
    { bg: "bg-teal-500", border: "border-teal-500", text: "text-teal-700", label: "Event" },
  ];

  const eventTitles = [
    "Basketball Tournament",
    "Team Training Session",
    "Client Meeting",
    "Yoga Class",
    "Swimming Practice",
    "Football Match",
    "Strategy Meeting",
    "Fitness Class",
    "Tennis Tournament",
    "Boxing Training",
    "Volleyball Game",
    "Running Club",
    "Cycling Event",
    "Martial Arts Class",
    "Gymnastics Practice",
  ];

  const eventTypes: ("event" | "training" | "meeting")[] = ["event", "training", "meeting"];

  const generateRandomEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const randomDays = new Set<number>();
    const numEvents = Math.floor(Math.random() * 8) + 5;
    
    while (randomDays.size < numEvents) {
      randomDays.add(Math.floor(Math.random() * daysInMonth) + 1);
    }
    
    randomDays.forEach((day, index) => {
      const colorIndex = index % eventColors.length;
      const colorScheme = eventColors[colorIndex];
      const numEventsForDay = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numEventsForDay; i++) {
        const hour = Math.floor(Math.random() * 12) + 8;
        const minute = Math.random() < 0.5 ? 0 : 30;
        const ampm = hour >= 12 ? "PM" : "AM";
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
        const time = `${displayHour}:${minute.toString().padStart(2, "0")} ${ampm}`;
        
        events.push({
          id: events.length + 1,
          title: eventTitles[Math.floor(Math.random() * eventTitles.length)],
          date: new Date(year, month, day),
          time: time,
          type: eventTypes[Math.floor(Math.random() * eventTypes.length)],
          color: colorScheme.bg,
          borderColor: colorScheme.border,
          textColor: colorScheme.text,
        });
      }
    });
    
    return events.sort((a, b) => {
      if (a.date.getDate() !== b.date.getDate()) {
        return a.date.getDate() - b.date.getDate();
      }
      return a.time.localeCompare(b.time);
    });
  }, [currentDate]);

  const dummyEvents: CalendarEvent[] = generateRandomEvents;

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

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek };
  };

  const getEventsForDay = (day: number) => {
    return dummyEvents.filter((event) => {
      return (
        event.date.getDate() === day &&
        event.date.getMonth() === currentDate.getMonth() &&
        event.date.getFullYear() === currentDate.getFullYear()
      );
    });
  };

  const getDayEvents = (day: number) => {
    return getEventsForDay(day);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentDate);
    const days = [];
    const prevMonthDays = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      0
    ).getDate();

    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push(
        <div key={`prev-${i}`} className="text-center py-2 text-gray-300 dark:text-slate-600 text-sm">
          {prevMonthDays - i}
        </div>
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayEvents = getEventsForDay(day);
      const isToday =
        day === new Date().getDate() &&
        currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      const uniqueColors = Array.from(new Set(dayEvents.map(e => e.color)));

      days.push(
        <div
          key={day}
          onClick={() => {
            if (dayEvents.length > 0) {
              setSelectedDay(day);
              setShowEventModal(true);
            }
          }}
          className={`relative text-center py-4 rounded-lg transition-all border-2 min-h-[60px] flex flex-col justify-center ${
            isToday ? "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-500" : "border-transparent"
          } ${
            dayEvents.length > 0
              ? "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700"
              : "cursor-default hover:bg-gray-50 dark:hover:bg-slate-700/50"
          }`}
        >
          <div
            className={`text-lg font-semibold mb-2 ${
              isToday ? "text-cyan-700 dark:text-cyan-400" : dayEvents.length > 0 ? "text-gray-800 dark:text-white" : "text-gray-700 dark:text-slate-300"
            }`}
          >
            {day}
          </div>
          {dayEvents.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center px-1">
              {uniqueColors.slice(0, 3).map((color, idx) => {
                const eventWithColor = dayEvents.find(e => e.color === color);
                return (
                  <div
                    key={idx}
                    className={`${color} h-2 w-2 rounded-full shadow-sm`}
                    title={eventWithColor?.title}
                  />
                );
              })}
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

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  const totalEvents = generateRandomEvents.length;
  const greenEvents = generateRandomEvents.filter(e => e.type === 'training').length;
  const redEvents = generateRandomEvents.filter(e => e.type === 'meeting').length;
  const blueEvents = generateRandomEvents.filter(e => e.type === 'event').length;

  const greenPercentage = Math.round((greenEvents / totalEvents) * 100);
  const redPercentage = Math.round((redEvents / totalEvents) * 100);
  const bluePercentage = Math.round((blueEvents / totalEvents) * 100);

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

      {showEventModal && selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  {monthNames[currentDate.getMonth()]} {selectedDay}, {currentDate.getFullYear()}
                </h2>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""} scheduled
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEventModal(false);
                  setSelectedDay(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedDayEvents.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-300 dark:text-slate-600 mb-4">
                    <Clock className="w-16 h-16 mx-auto" />
                  </div>
                  <p className="text-gray-500 dark:text-slate-400 text-lg">No events scheduled for this day</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDayEvents.map((event) => (
                    <div
                      key={event.id}
                      className="border border-gray-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-slate-700/50"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`${event.color} w-4 h-4 rounded-full mt-2 flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-800 dark:text-white text-lg mb-1">{event.title}</h4>
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300 mb-3">
                                <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500" />
                                <span className="font-medium">{event.time}</span>
                              </div>
                            </div>
                            <span
                              className={`text-xs px-3 py-1 rounded-full font-medium ${
                                event.type === "event"
                                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                                  : event.type === "training"
                                  ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300"
                                  : "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                              }`}
                            >
                              {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
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

export default CoachCalendar;

