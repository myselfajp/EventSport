"use client";

import React, { useState, useEffect, useRef } from "react";
import { Menu, Calendar, Bell } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { fetchJSON } from "../app/lib/api";
import { EP } from "../app/lib/endpoints";

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
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return "Just now";
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days} ${days === 1 ? "day" : "days"} ago`;
    } else {
      return notificationDate.toLocaleDateString();
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetchJSON(EP.NOTIFICATIONS.getAll, {
        method: "GET",
      });
      if (response?.success) {
        setNotifications(response.data || []);
        setUnreadCount(response.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetchJSON(EP.NOTIFICATIONS.getUnreadCount, {
        method: "GET",
      });
      if (response?.success) {
        setUnreadCount(response.data?.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await fetchJSON(EP.NOTIFICATIONS.markAsRead(notificationId), {
        method: "PUT",
      });
      // Update local state
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetchJSON(EP.NOTIFICATIONS.markAllAsRead, {
        method: "PUT",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isNotificationsOpen) {
      fetchNotifications();
    }
  }, [isNotificationsOpen]);

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
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                  <span className="text-xs text-white font-medium">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </div>
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
                  {loading ? (
                    <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      Loading...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500 dark:text-slate-400 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification._id}
                        onClick={() => {
                          if (!notification.isRead) {
                            handleMarkAsRead(notification._id);
                          }
                          if (notification.actionUrl) {
                            window.location.href = notification.actionUrl;
                          }
                        }}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors ${
                          !notification.isRead
                            ? "bg-blue-50 dark:bg-blue-900/20"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <Bell className="w-4 h-4 text-gray-400 dark:text-slate-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200">
                              {notification.title}
                            </p>
                            <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                              {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && unreadCount > 0 && (
                  <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                    <button
                      onClick={handleMarkAllAsRead}
                      className="w-full text-center text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 font-medium transition-colors"
                    >
                      Mark All as Read
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
