"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Menu,
  Calendar,
  Bell,
  CheckCircle,
  XCircle,
  MapPin,
  Users,
  Coins,
  Clock,
  Flame,
  Gift,
  Star,
  Megaphone,
  AlertTriangle,
  Info,
  User,
  MessageSquare,
  BookOpen,
  Newspaper,
  Video,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { fetchJSON } from "../app/lib/api";
import { EP } from "../app/lib/endpoints";
import { getConversations } from "../app/lib/messages-api";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onLeftSidebarToggle: () => void;
  onRightSidebarToggle: () => void;
}

const NOTIFICATION_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  bell: Bell,
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  calendar: Calendar,
  user: User,
  alert: AlertTriangle,
  info: Info,
  "map-pin": MapPin,
  users: Users,
  coins: Coins,
  clock: Clock,
  flame: Flame,
  gift: Gift,
  star: Star,
  megaphone: Megaphone,
};

const PRIORITY_COLOR: Record<string, string> = {
  low: "text-gray-400 dark:text-slate-500",
  normal: "text-cyan-600 dark:text-cyan-400",
  high: "text-orange-500 dark:text-orange-400",
  urgent: "text-red-500 dark:text-red-400",
};

function getNotificationIcon(name?: string) {
  if (!name) return Bell;
  return NOTIFICATION_ICON_MAP[name] ?? Bell;
}

const Header: React.FC<HeaderProps> = ({
  onLeftSidebarToggle,
  onRightSidebarToggle,
}) => {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [headerLogoUrl, setHeaderLogoUrl] = useState<string | null>(null);
  const [headerLogoAlt, setHeaderLogoAlt] = useState("EventSport");

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      handleMarkAsRead(notification._id);
    }
    const url = notification.actionUrl;
    if (url && typeof url === "string") {
      setIsNotificationsOpen(false);
      try {
        if (url.startsWith("/?serviceRequests=") && typeof window !== "undefined") {
          const tab = new URLSearchParams(url.slice(url.indexOf("?"))).get("serviceRequests");
          window.history.pushState(null, "", url);
          window.dispatchEvent(
            new CustomEvent("eventsport:open-service-requests", {
              detail: { tab: tab === "incoming" ? "incoming" : "mine" },
            })
          );
          return;
        }
        if (url.startsWith("/")) {
          router.push(url);
        } else {
          window.location.href = url;
        }
      } catch {
        /* ignore navigation errors */
      }
    }
  };

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

  const fetchMessageUnreadCount = async () => {
    try {
      const conversations = await getConversations();
      const total = conversations.reduce(
        (sum, conv) => sum + (conv.unreadCount || 0),
        0
      );
      setMessageUnreadCount(total);
    } catch (err) {
      console.error("Failed to fetch message unread count:", err);
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
    fetchMessageUnreadCount();

    // Poll for new notifications and unread messages every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchMessageUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetchJSON(
      EP.PUBLIC.dashboardHeaderLogo,
      { method: "GET" },
      { skipAuth: true }
    ).then((res) => {
      if (cancelled || !res?.success || !res.data?.image?.path) return;
      setHeaderLogoUrl(EP.assetUrl(res.data.image.path));
      setHeaderLogoAlt(res.data.imageAlt || "EventSport");
    });
    return () => {
      cancelled = true;
    };
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
      <header className="site-header shrink-0 border-b border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900 transition-colors duration-300">
        <div className="flex h-full items-center justify-between px-4 md:px-6">
          <div className="flex flex-1 items-center justify-start min-w-0">
            <button
              type="button"
              onClick={onLeftSidebarToggle}
              className="hidden md:inline-flex items-center justify-center p-2 -ml-2 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5 shrink-0" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => router.push("/blogs")}
              className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open blogs"
            >
              <BookOpen className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline text-sm font-medium">Blogs</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/news")}
              className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open news"
            >
              <Newspaper className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline text-sm font-medium">News</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/videos")}
              className="inline-flex items-center gap-2 px-2.5 py-2 rounded-lg text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Open videos"
            >
              <Video className="w-5 h-5 shrink-0" strokeWidth={1.75} />
              <span className="hidden sm:inline text-sm font-medium">Videos</span>
            </button>
          </div>

          <div className="header-logo-wrap flex-1 min-w-0 px-2">
            {headerLogoUrl ? (
              <img
                src={headerLogoUrl}
                alt={headerLogoAlt}
                decoding="async"
                className="header-logo-img select-none pointer-events-none"
              />
            ) : null}
          </div>

          <div className="flex flex-1 items-center justify-end gap-0.5 md:gap-1 min-w-0">
          {/* Theme Toggle */}
          <ThemeToggle variant="icon" />

          {/* Messages */}
          <button
            onClick={() => router.push("/messaging")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded relative text-gray-700 dark:text-slate-300 transition-colors"
            aria-label="Messages"
          >
            <MessageSquare className="w-5 h-5" />
            {messageUnreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center">
                <span className="text-xs text-white font-medium">
                  {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                </span>
              </div>
            )}
          </button>

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
              <div className="absolute right-0 top-12 z-[120] w-80 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg dark:shadow-xl max-h-96 overflow-y-auto">
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
                    notifications.map((notification) => {
                      const Icon = getNotificationIcon(notification.icon);
                      const colorClass =
                        PRIORITY_COLOR[notification.priority] ??
                        "text-gray-400 dark:text-slate-500";
                      const clickable =
                        !!notification.actionUrl || !notification.isRead;
                      return (
                        <div
                          key={notification._id}
                          onClick={
                            clickable
                              ? () => handleNotificationClick(notification)
                              : undefined
                          }
                          role={clickable ? "button" : undefined}
                          tabIndex={clickable ? 0 : undefined}
                          onKeyDown={
                            clickable
                              ? (e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleNotificationClick(notification);
                                  }
                                }
                              : undefined
                          }
                          className={`p-3 transition-colors ${
                            clickable
                              ? "hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                              : ""
                          } ${
                            !notification.isRead
                              ? "bg-blue-50 dark:bg-blue-900/20"
                              : ""
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <Icon
                              className={`w-4 h-4 ${colorClass} mt-0.5 flex-shrink-0`}
                            />
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
                      );
                    })
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
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-700 dark:text-slate-300 transition-colors"
            aria-label="Open calendar"
          >
            <Calendar className="w-5 h-5" strokeWidth={1.75} />
          </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
