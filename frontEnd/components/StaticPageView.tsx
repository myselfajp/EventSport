"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

interface StaticPageViewProps {
  pageName: string;
  onBack: () => void;
}

const StaticPageView: React.FC<StaticPageViewProps> = ({ pageName, onBack }) => {
  const [page, setPage] = useState<{ title: string; content: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPage = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJSON(
          EP.PUBLIC.staticPageByName(pageName),
          { method: "GET" },
          { skipAuth: true }
        );
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
  }, [pageName]);

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
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-red-600 dark:text-red-400">{error || "Page not found"}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 mb-6 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100 mb-6">
        {page.title}
      </h1>
      <div
        className="prose prose-gray dark:prose-invert max-w-none text-gray-700 dark:text-slate-300"
        dangerouslySetInnerHTML={{ __html: page.content }}
      />
    </div>
  );
};

export default StaticPageView;
