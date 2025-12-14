"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu, Calendar, Bell } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onLeftSidebarToggle,
  onRightSidebarToggle,
}) => {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dummy notification data
  const notifications = [
    {
      id: 1,
      message:
        "Coach John Smith has created a new event: Basketball Training Session",
      time: "2 hours ago",
      unread: true,
    },
    {
      id: 2,
      message: "Coach Maria Garcia has updated her availability for next week",
      time: "5 hours ago",
      unread: true,
    },
    {
      id: 3,
      message:
        "Your facility booking at Downtown Sports Center has been confirmed",
      time: "1 day ago",
      unread: false,
    },
    {
      id: 4,
      message:
        "Coach Alex Johnson has sent you a message about the upcoming tournament",
      time: "2 days ago",
      unread: false,
    },
    {
      id: 5,
      message:
        "New group session available: Advanced Soccer Skills with Coach David",
      time: "3 days ago",
      unread: false,
    },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };

    if (isNotificationsOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isNotificationsOpen]);

  return (
    <>
      <div className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 md:px-6 py-4 flex items-center justify-between transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeftSidebarToggle}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-slate-300 hidden md:block transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="font-semibold text-gray-800 dark:text-slate-100 text-sm md:text-base">
              Dashboard
            </h2>
            <p className="text-xs md:text-sm text-gray-500 dark:text-slate-400 hidden sm:block">
              You've got 24 New Sales
            </p>
          </div>
        </div>

        {/* Calendar, Theme Toggle, and Notification buttons */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon" />

          {/* Notifications */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded relative text-gray-700 dark:text-slate-300 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {notifications.some((n) => n.unread) && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></div>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 dark:border-slate-700">
                  <h3 className="font-medium text-gray-800 dark:text-slate-100 text-sm">
                    Notifications
                  </h3>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-slate-700">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${
                          notification.unread
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Bell className="w-4 h-4 text-gray-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-800 dark:text-slate-200 leading-relaxed">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              {notification.time}
                            </p>
                          </div>
                          {notification.unread && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                    <button className="w-full text-center text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors">
                      View All Notifications
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Calendar Toggle */}
          <button
            onClick={onRightSidebarToggle}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded text-gray-700 dark:text-slate-300 transition-colors"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );
};

export default Header;
