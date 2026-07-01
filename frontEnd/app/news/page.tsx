"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Filter, Newspaper, Search, User } from "lucide-react";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";

type NewsItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage?: { path?: string } | null;
  sportGroup?: { _id: string; name: string } | null;
  sport?: { _id: string; name: string } | null;
  author?: { name: string; type: string };
  publishedAt?: string;
};

type SportGroup = { _id: string; name: string };
type Sport = { _id: string; name: string; group: string };

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export default function NewsPage() {
  const { data: user } = useMe();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ search: "", sportGroup: "", sport: "" });
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, perPage: 12 });

  useEffect(() => {
    void fetchJSON(EP.PUBLIC.sportGroups({ page: 1, limit: 100 }), { method: "GET" }, { skipAuth: true }).then(res => {
      if (res?.success && Array.isArray(res.data)) setSportGroups(res.data);
    });
  }, []);

  useEffect(() => {
    if (!filters.sportGroup) { setSports([]); setFilters(prev => ({ ...prev, sport: "" })); return; }
    void fetchJSON(EP.PUBLIC.sports({ page: 1, limit: 100, sportGroup: filters.sportGroup }), { method: "GET" }, { skipAuth: true }).then(res => {
      setSports(res?.success && Array.isArray(res.data) ? res.data : []);
    });
  }, [filters.sportGroup]);

  useEffect(() => {
    let cancelled = false;
    const loadNews = async () => {
      setLoading(true); setError("");
      try {
        const res = await fetchJSON(EP.PUBLIC.news({ page, limit: pagination.perPage, search: filters.search.trim() || undefined, sportGroup: filters.sportGroup || undefined, sport: filters.sport || undefined }), { method: "GET" }, { skipAuth: true });
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setNewsItems(res.data);
          setPagination({ totalPages: res.pagination?.totalPages || 1, total: res.pagination?.total || res.data.length, perPage: res.pagination?.perPage || 12 });
        } else { setNewsItems([]); setError(res?.message || res?.error || "Failed to load news"); }
      } catch (err) {
        if (!cancelled) { setNewsItems([]); setError(err instanceof Error ? err.message : "Failed to load news"); }
      } finally { if (!cancelled) setLoading(false); }
    };
    void loadNews();
    return () => { cancelled = true; };
  }, [filters, page, pagination.perPage]);

  const activeSportGroupName = useMemo(() => sportGroups.find(g => g._id === filters.sportGroup)?.name, [filters.sportGroup, sportGroups]);

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, ...(key === "sportGroup" ? { sport: "" } : {}) }));
    setPage(1);
  };

  const clearFilters = () => { setFilters({ search: "", sportGroup: "", sport: "" }); setPage(1); };

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
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">News</h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Latest sports news and announcements from EventSport.</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {user?.role === 0 && (
                  <Link href="/admin-panel?tab=news" className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors">
                    <Newspaper className="w-4 h-4" />Manage News (Admin)
                  </Link>
                )}
                <Link href="/" className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                  Back to Site
                </Link>
              </div>
            </div>

            <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h2>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={clearFilters} className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${!filters.search && !filters.sportGroup && !filters.sport ? "bg-cyan-600 text-white border-cyan-600" : "bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600"}`}>All</button>
                {activeSportGroupName && <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800">{activeSportGroupName}</span>}
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Search</label>
                  <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" /><input value={filters.search} onChange={e => updateFilter("search", e.target.value)} placeholder="Search news" className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white" /></div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sport Group</label>
                  <select value={filters.sportGroup} onChange={e => updateFilter("sportGroup", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white">
                    <option value="">All Sport Groups</option>{sportGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sport</label>
                  <select value={filters.sport} disabled={!filters.sportGroup} onChange={e => updateFilter("sport", e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white disabled:opacity-50">
                    <option value="">All Sports</option>{sports.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {error && <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">{error}</div>}

            {loading ? (
              <div className="py-16 text-center text-gray-500 dark:text-slate-400">Loading news...</div>
            ) : newsItems.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">No news articles found.</div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {newsItems.map(item => (
                  <Link key={item._id} href={`/news/${item.slug}`} className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden hover:border-cyan-300 dark:hover:border-cyan-700 hover:shadow-md transition-all">
                    <div className="aspect-[16/9] bg-gray-100 dark:bg-slate-700 overflow-hidden">
                      {item.coverImage?.path ? (
                        <img src={EP.assetUrl(item.coverImage.path)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400"><Newspaper className="w-10 h-10 opacity-30" /></div>
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <div className="flex flex-wrap gap-2 text-xs">
                        {item.sportGroup?.name && <span className="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">{item.sportGroup.name}</span>}
                        {item.sport?.name && <span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">{item.sport.name}</span>}
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white line-clamp-2">{item.title}</h2>
                      <p className="text-sm text-gray-600 dark:text-slate-300 line-clamp-3">{item.excerpt}</p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1"><User className="w-3.5 h-3.5" />{item.author?.name || "EventSport Team"}</span>
                        <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(item.publishedAt)}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3">
                <button type="button" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50">Previous</button>
                <span className="text-sm text-gray-600 dark:text-slate-400">Page {page} of {pagination.totalPages} ({pagination.total} total)</span>
                <button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 disabled:opacity-50">Next</button>
              </div>
            )}
          </div>
        </main>
      </div>
      <RightSidebar isOpen={rightSidebarOpen} currentDate={currentDate} setCurrentDate={setCurrentDate} calendarView={calendarView} setCalendarView={setCalendarView} events={[]} />
    </div>
  );
}
