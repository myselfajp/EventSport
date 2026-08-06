"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, User, BookOpen, Plus, X } from "lucide-react";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import PageHeroBanner from "@/components/PageHeroBanner";
import BlogManagement from "@/components/blog/BlogManagement";
import SportsBanner from "@/components/SportsBanner";

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: { path?: string } | null;
  sportGroup?: { _id: string; name: string } | null;
  sport?: { _id: string; name: string } | null;
  author?: { name: string; type: "admin" | "coach"; coachId?: string | null };
  publishedAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function BlogsPageContent() {
  const { data: user } = useMe();
  const router = useRouter();
  const searchParams = useSearchParams();
  const coachId = searchParams.get("coach") || "";
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [isBlogsListOpen, setIsBlogsListOpen] = useState(false);

  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    total: 0,
    perPage: 12,
  });

  useEffect(() => {
    let cancelled = false;
    const loadBlogs = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJSON(
          EP.PUBLIC.blogs({
            page,
            limit: pagination.perPage,
            sport: selectedSportId || undefined,
            coachId: coachId || undefined,
          }),
          { method: "GET" },
          { skipAuth: true }
        );
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setBlogs(res.data);
          setPagination({
            totalPages: res.pagination?.totalPages || 1,
            total: res.pagination?.total || res.data.length,
            perPage: res.pagination?.perPage || 12,
          });
        } else {
          setBlogs([]);
          setError(res?.message || res?.error || "Failed to load blogs");
        }
      } catch (err) {
        if (!cancelled) {
          setBlogs([]);
          setError(err instanceof Error ? err.message : "Failed to load blogs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadBlogs();
    return () => {
      cancelled = true;
    };
  }, [selectedSportId, page, pagination.perPage, coachId]);

  const coachFilterName = useMemo(() => {
    if (!coachId || blogs.length === 0) return null;
    return blogs.find((blog) => blog.author?.coachId === coachId)?.author?.name || null;
  }, [coachId, blogs]);

  const handleSportFilter = (sportId: string | null) => {
    setSelectedSportId(sportId);
    setPage(1);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <LeftSidebar isOpen={leftSidebarOpen} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />

        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
            <PageHeroBanner context="blog" />

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {coachFilterName ? `Blogs by ${coachFilterName}` : "Blogs"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {coachFilterName
                    ? `Articles written by ${coachFilterName}.`
                    : "Articles, training notes, and sport insights from EventSport coaches."}
                </p>
                {coachId && (
                  <button
                    type="button"
                    onClick={() => router.push("/blogs")}
                    className="mt-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:underline"
                  >
                    Show all blogs
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {user?.role === 0 && (
                  <Link
                    href="/admin-panel?tab=blogs"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                  >
                    <BookOpen className="w-4 h-4" />
                    Manage Blogs (Admin)
                  </Link>
                )}
                {!!user?.coach && (
                  <button
                    onClick={() => setIsBlogsListOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Blog Post
                  </button>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Back to Site
                </Link>
              </div>
            </div>

            <SportsBanner
              selectedSportId={selectedSportId}
              onSportClick={handleSportFilter}
            />

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-gray-500 dark:text-slate-400">
                Loading blogs...
              </div>
            ) : blogs.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                No blog posts found.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {blogs.map((blog) => (
                  <Link
                    key={blog._id}
                    href={`/blogs/${blog.slug}`}
                    className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition-all"
                  >
                    <div className="aspect-[16/9] bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      {blog.coverImage?.path ? (
                        <img
                          src={EP.assetUrl(blog.coverImage.path)}
                          alt={blog.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          Blog
                        </div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {blog.sportGroup?.name && (
                          <span className="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                            {blog.sportGroup.name}
                          </span>
                        )}
                        {blog.sport?.name && (
                          <span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                            {blog.sport.name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">
                        {blog.title}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-3">
                        {blog.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          {blog.author?.name || "EventSport"}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {formatDate(blog.publishedAt)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-gray-600 dark:text-slate-400">
                  Page {page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
      <RightSidebar
        isOpen={rightSidebarOpen}
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        calendarView={calendarView}
        setCalendarView={setCalendarView}
        events={[]}
      />
      {isBlogsListOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  My Blogs
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Manage the blog posts shown on the public blog page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBlogsListOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                aria-label="Close blogs"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-73px)]">
              <BlogManagement mode="coach" embedded />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function BlogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </div>
      }
    >
      <BlogsPageContent />
    </Suspense>
  );
}
