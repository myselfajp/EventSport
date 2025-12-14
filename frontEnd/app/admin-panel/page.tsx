"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "../hooks/useAuth";
import { fetchJSON } from "../lib/api";
import { EP } from "../lib/endpoints";
import { useState } from "react";

export default function AdminPanelPage() {
  const router = useRouter();
  const { data: user, isLoading } = useMe();
  const [adminData, setAdminData] = useState<any>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(true);

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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100 mb-4">
            Admin Panel
          </h1>
          <div className="mt-8">
            <p className="text-xl text-gray-700 dark:text-slate-300">Hello World</p>
          </div>
        </div>
      </div>
    </div>
  );
}

