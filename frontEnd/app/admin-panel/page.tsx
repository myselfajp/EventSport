"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { useMe } from "../hooks/useAuth";
import { fetchJSON } from "../lib/api";
import { EP } from "../lib/endpoints";
import UsersManagement from "../../components/admin/UsersManagement";
import CoachCertificateApproval from "../../components/admin/CoachCertificateApproval";
import PerformanceTeamApproval from "../../components/admin/PerformanceTeamApproval";
import EnumManagement from "../../components/admin/EnumManagement";
import EventsManagement from "../../components/admin/EventsManagement";
import NotificationManagement from "../../components/admin/NotificationManagement";
import ContractsManagement from "../../components/admin/ContractsManagement";
import StaticPagesManagement from "../../components/admin/StaticPagesManagement";
import SubscriptionPlansManagement from "../../components/admin/SubscriptionPlansManagement";
import SuggestionsManagement from "../../components/admin/SuggestionsManagement";
import ReportsManagement from "../../components/admin/ReportsManagement";
import DashboardHeroManagement from "../../components/admin/DashboardHeroManagement";
import AdminPermissionGroupsManagement from "../../components/admin/AdminPermissionGroupsManagement";
import BlacklistManagement from "../../components/admin/BlacklistManagement";
import NewsManagement from "../../components/news/NewsManagement";
import VideoManagement from "../../components/video/VideoManagement";
import BlogManagement from "../../components/blog/BlogManagement";
import WelcomePageManagement from "../../components/admin/WelcomePageManagement";

type TabType =
  | "users"
  | "blacklist"
  | "coaches"
  | "performance"
  | "enums"
  | "events"
  | "blogs"
  | "news"
  | "videos"
  | "notifications"
  | "contracts"
  | "site-pages"
  | "subscription-plans"
  | "suggestions"
  | "reports"
  | "dashboard-hero"
  | "welcome-page"
  | "permission-groups";

const TAB_ORDER: TabType[] = [
  "users",
  "blacklist",
  "coaches",
  "performance",
  "enums",
  "events",
  "blogs",
  "news",
  "videos",
  "notifications",
  "contracts",
  "site-pages",
  "subscription-plans",
  "dashboard-hero",
  "welcome-page",
  "suggestions",
  "reports",
  "permission-groups",
];

const TAB_LABEL: Record<TabType, string> = {
  users: "Users",
  blacklist: "Blacklist",
  coaches: "Coach Certificates",
  performance: "Performance Team",
  enums: "Enum Management",
  events: "Events",
  blogs: "Blogs",
  news: "News",
  videos: "Videos",
  notifications: "Notifications",
  contracts: "Contracts",
  "site-pages": "Site Pages",
  "subscription-plans": "Sales",
  "dashboard-hero": "Dashboard Hero",
  "welcome-page": "Welcome Page",
  suggestions: "Suggestions",
  reports: "Reports",
  "permission-groups": "Permission Groups",
};

/** Admin API permission slug per tab (UI-only tabs use same keys as backend constants). */
const TAB_PERM: Partial<Record<TabType, string | string[]>> = {
  users: "admin.users",
  blacklist: ["admin.blacklist", "admin.users"],
  coaches: "admin.coaches",
  performance: "admin.coaches",
  enums: "admin.enums",
  events: "admin.events",
  blogs: "admin.blogs",
  news: "admin.news",
  videos: "admin.videos",
  notifications: "admin.notifications",
  contracts: ["admin.legal", "admin.contract_acceptances"],
  "site-pages": "admin.static_pages",
  "subscription-plans": "admin.subscription_plans",
  "dashboard-hero": "admin.dashboard_hero",
  "welcome-page": "admin.welcome_page",
  suggestions: "admin.suggestions",
  reports: "admin.reports",
};

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const [adminData, setAdminData] = useState<{
    permissions?: string[];
    isFullAdmin?: boolean;
    user?: unknown;
  } | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("users");
  const [unreadReportsCount, setUnreadReportsCount] = useState(0);

  const perms = adminData?.permissions ?? [];
  const isFullAdmin = adminData?.isFullAdmin === true;

  const canTab = useCallback(
    (tab: TabType) => {
      if (tab === "permission-groups") return isFullAdmin;
      const key = TAB_PERM[tab];
      if (!key) return false;
      if (perms.includes("*")) return true;
      const keys = Array.isArray(key) ? key : [key];
      return keys.some((k) => perms.includes(k));
    },
    [perms, isFullAdmin]
  );

  const visibleTabs = useMemo(() => TAB_ORDER.filter((t) => canTab(t)), [canTab]);
  const canViewReports = canTab("reports");

  const fetchUnreadReportsCount = useCallback(async () => {
    if (!canViewReports) return;
    try {
      const res = await fetchJSON(EP.ADMIN.reports.unreadCount, { method: "GET" });
      if (res?.success) {
        setUnreadReportsCount(res.data?.unreadCount ?? 0);
      }
    } catch {
      /* ignore polling errors */
    }
  }, [canViewReports]);

  const markReportsViewed = useCallback(async () => {
    if (!canViewReports) return;
    try {
      await fetchJSON(EP.ADMIN.reports.markViewed, { method: "POST" });
      setUnreadReportsCount(0);
    } catch {
      /* ignore */
    }
  }, [canViewReports]);

  useEffect(() => {
    if (!canViewReports) return;
    void fetchUnreadReportsCount();
    const interval = setInterval(() => {
      if (activeTab !== "reports") {
        void fetchUnreadReportsCount();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [canViewReports, activeTab, fetchUnreadReportsCount]);

  useEffect(() => {
    if (activeTab === "reports" && canViewReports) {
      void markReportsViewed();
    }
  }, [activeTab, canViewReports, markReportsViewed]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/");
      return;
    }

    if (user && user.role !== 0) {
      router.push("/");
      return;
    }

    if (user && user.role === 0) {
      fetchAdminData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, router]);

  useEffect(() => {
    if (!adminData?.permissions) return;

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab") as TabType;
      if (tabParam && TAB_ORDER.includes(tabParam) && canTab(tabParam)) {
        if (activeTab !== tabParam) {
          setActiveTab(tabParam);
        }
        return;
      }
    }

    if (canTab(activeTab)) return;
    const first = TAB_ORDER.find((t) => canTab(t));
    if (first) setActiveTab(first);
  }, [adminData, activeTab, canTab]);

  const fetchAdminData = async () => {
    try {
      setIsLoadingAdmin(true);
      const data = await fetchJSON(EP.ADMIN.panel, { method: "GET" });
      if (data?.success) {
        setAdminData(data.data);
      } else {
        router.push("/");
      }
    } catch {
      router.push("/");
    } finally {
      setIsLoadingAdmin(false);
    }
  };

  if (isLoading || isLoadingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 0) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">
              Admin Panel
            </h1>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5"
            >
              <Home className="w-4 h-4" />
              Back to Site
            </button>
          </div>

          {visibleTabs.length === 0 && (
            <p className="text-amber-800 dark:text-amber-200 text-sm mb-4">
              Your account does not have any assigned admin permissions. Ask a full admin to assign a permission group.
            </p>
          )}

          <div className="border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
            <nav className="flex flex-nowrap gap-6 sm:space-x-8 min-w-min pb-1">
              {visibleTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`relative py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap shrink-0 ${
                    activeTab === tab
                      ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {TAB_LABEL[tab]}
                    {tab === "reports" && unreadReportsCount > 0 && (
                      <span
                        className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0"
                        title={`${unreadReportsCount} new report${unreadReportsCount === 1 ? "" : "s"}`}
                        aria-label={`${unreadReportsCount} unread report${unreadReportsCount === 1 ? "" : "s"}`}
                      />
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "users" && <UsersManagement isFullAdmin={isFullAdmin} />}
            {activeTab === "blacklist" && <BlacklistManagement />}
            {activeTab === "coaches" && <CoachCertificateApproval />}
            {activeTab === "performance" && <PerformanceTeamApproval />}
            {activeTab === "enums" && <EnumManagement />}
            {activeTab === "events" && <EventsManagement />}
            {activeTab === "blogs" && <BlogManagement mode="admin" />}
            {activeTab === "news" && <NewsManagement />}
            {activeTab === "videos" && <VideoManagement mode="admin" />}
            {activeTab === "notifications" && <NotificationManagement />}
            {activeTab === "contracts" && (
              <ContractsManagement
                canEditLegal={perms.includes("*") || perms.includes("admin.legal")}
                canViewAcceptances={
                  perms.includes("*") ||
                  perms.includes("admin.contract_acceptances") ||
                  perms.includes("admin.legal")
                }
              />
            )}
            {activeTab === "site-pages" && <StaticPagesManagement />}
            {activeTab === "subscription-plans" && <SubscriptionPlansManagement />}
            {activeTab === "dashboard-hero" && <DashboardHeroManagement />}
            {activeTab === "welcome-page" && <WelcomePageManagement />}
            {activeTab === "suggestions" && <SuggestionsManagement />}
            {activeTab === "reports" && <ReportsManagement />}
            {activeTab === "permission-groups" && <AdminPermissionGroupsManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
