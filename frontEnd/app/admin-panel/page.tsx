"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Home } from "lucide-react";
import { useMe } from "../hooks/useAuth";
import { fetchJSON } from "../lib/api";
import { EP } from "../lib/endpoints";
import UsersManagement from "../../components/admin/UsersManagement";
import CoachCertificateApproval from "../../components/admin/CoachCertificateApproval";
import EnumManagement from "../../components/admin/EnumManagement";
import EventsManagement from "../../components/admin/EventsManagement";
import NotificationManagement from "../../components/admin/NotificationManagement";
import LegalManagement from "../../components/admin/LegalManagement";
import StaticPagesManagement from "../../components/admin/StaticPagesManagement";

type TabType = "users" | "coaches" | "enums" | "events" | "notifications" | "legal" | "static-pages";

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const [adminData, setAdminData] = useState<any>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("users");

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

  const fetchAdminData = async () => {
    try {
      setIsLoadingAdmin(true);
      const data = await fetchJSON(EP.ADMIN.panel, { method: "GET" });
      if (data?.success) {
        setAdminData(data.data);
      } else {
        router.push("/");
      }
    } catch (error) {
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

          <div className="border-b border-gray-200 dark:border-slate-700 mb-6">
            <nav className="flex space-x-8">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "users"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Users
              </button>
              <button
                onClick={() => setActiveTab("coaches")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "coaches"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Coach Certificates
              </button>
              <button
                onClick={() => setActiveTab("enums")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "enums"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Enum Management
              </button>
              <button
                onClick={() => setActiveTab("events")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "events"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Events
              </button>
              <button
                onClick={() => setActiveTab("notifications")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "notifications"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Notifications
              </button>
              <button
                onClick={() => setActiveTab("legal")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "legal"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Legal (KVKK & Terms)
              </button>
              <button
                onClick={() => setActiveTab("static-pages")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === "static-pages"
                    ? "border-cyan-500 text-cyan-600 dark:text-cyan-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-slate-400 dark:hover:text-slate-300"
                }`}
              >
                Static Pages
              </button>
            </nav>
          </div>

          <div className="mt-6">
            {activeTab === "users" && <UsersManagement />}
            {activeTab === "coaches" && <CoachCertificateApproval />}
            {activeTab === "enums" && <EnumManagement />}
            {activeTab === "events" && <EventsManagement />}
            {activeTab === "notifications" && <NotificationManagement />}
            {activeTab === "legal" && <LegalManagement />}
            {activeTab === "static-pages" && <StaticPagesManagement />}
          </div>
        </div>
      </div>
    </div>
  );
}
