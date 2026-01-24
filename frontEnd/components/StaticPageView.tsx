"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface StaticPageViewProps {
  pageId: string;
  onBack: () => void;
}

const StaticPageView: React.FC<StaticPageViewProps> = ({ pageId, onBack }) => {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJSON(EP.ADMIN.staticPages.getById(pageId), { method: "GET" });
        if (res?.success && res?.data) {
          setPage(res.data);
        } else {
          setError(res?.message || "Failed to load page");
        }
      } catch (err: any) {
        setError(err.message || "Failed to load page");
      } finally {
        setLoading(false);
      }
    };
    fetchPage();
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error || "Page not found"}</p>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Back to Events"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-slate-300" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{page.title}</h2>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-8">
          <div
            className="static-page-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </div>
      </div>
    </div>
  );
};

export default StaticPageView;
