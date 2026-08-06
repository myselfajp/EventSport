"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, Play, Plus, User, Video, X } from "lucide-react";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import PageHeroBanner from "@/components/PageHeroBanner";
import SportsBanner from "@/components/SportsBanner";
import VideoManagement from "@/components/video/VideoManagement";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import {
  VIDEO_TYPE_OPTIONS,
  type VideoType,
  videoTypeLabel,
} from "@/app/lib/video-utils";
import { VideoTypeIcon } from "@/components/video/VideoTypeIcons";

type VideoAuthor = {
  name: string;
  type: "admin" | "coach";
  coachId?: string | null;
};

type VideoItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  videoType: VideoType;
  thumbnail?: { path?: string } | null;
  sportGroup?: { _id: string; name: string } | null;
  sport?: { _id: string; name: string } | null;
  author?: VideoAuthor;
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

function AuthorLink({ author }: { author?: VideoAuthor }) {
  const name = author?.name || "EventSport Team";

  if (author?.type === "coach" && author.coachId) {
    return (
      <Link
        href={`/videos?coach=${encodeURIComponent(author.coachId)}`}
        onClick={(event) => event.stopPropagation()}
        className="font-medium text-cyan-700 dark:text-cyan-300 hover:underline"
      >
        {name}
      </Link>
    );
  }

  return <span>{name}</span>;
}

function VideosPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const coachId = searchParams.get("coach") || "";
  const { data: user } = useMe();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");

  const [activeType, setActiveType] = useState<VideoType>("educational");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSportId, setSelectedSportId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, perPage: 12 });
  const [isVideosManageOpen, setIsVideosManageOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadVideos = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJSON(
          EP.PUBLIC.videos({
            page,
            limit: pagination.perPage,
            sport: selectedSportId || undefined,
            videoType: activeType,
            coachId: coachId || undefined,
          }),
          { method: "GET" },
          { skipAuth: true }
        );
        if (cancelled) return;
        if (res?.success && Array.isArray(res.data)) {
          setVideos(res.data);
          setPagination({
            totalPages: res.pagination?.totalPages || 1,
            total: res.pagination?.total || res.data.length,
            perPage: res.pagination?.perPage || 12,
          });
        } else {
          setVideos([]);
          setError(res?.message || res?.error || "Failed to load videos");
        }
      } catch (err) {
        if (!cancelled) {
          setVideos([]);
          setError(err instanceof Error ? err.message : "Failed to load videos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void loadVideos();
    return () => {
      cancelled = true;
    };
  }, [activeType, selectedSportId, page, pagination.perPage, coachId]);

  const coachFilterName = useMemo(() => {
    if (!coachId || videos.length === 0) return null;
    return videos.find((video) => video.author?.coachId === coachId)?.author?.name || null;
  }, [coachId, videos]);

  const handleSportFilter = (sportId: string | null) => {
    setSelectedSportId(sportId);
    setPage(1);
  };

  const canManageVideos = user?.role === 0 || !!user?.coach;

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
            <PageHeroBanner context="videos" />

            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {coachFilterName ? `Videos by ${coachFilterName}` : "Videos"}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {coachFilterName
                    ? `Videos uploaded by ${coachFilterName}.`
                    : "Educational and general videos uploaded by EventSport coaches and admins."}
                </p>
                {coachId && (
                  <button
                    type="button"
                    onClick={() => router.push("/videos")}
                    className="mt-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:underline"
                  >
                    Show all videos
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {canManageVideos && (
                  <button
                    type="button"
                    onClick={() => setIsVideosManageOpen(true)}
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {user?.role === 0 ? "Manage Videos" : "Upload Video"}
                  </button>
                )}
                {user?.role === 0 && (
                  <Link
                    href="/admin-panel?tab=videos"
                    className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg border border-cyan-200 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                  >
                    <Video className="w-4 h-4" />
                    Admin Panel
                  </Link>
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

            <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-1.5">
              <div className="grid gap-1.5 sm:grid-cols-2">
                {VIDEO_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      setActiveType(option.id);
                      setPage(1);
                    }}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      activeType === option.id
                        ? "bg-cyan-600 text-white shadow-sm"
                        : "bg-gray-50 dark:bg-slate-900/50 text-gray-800 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    <VideoTypeIcon
                      type={option.id}
                      className={`w-7 h-7 shrink-0 ${activeType === option.id ? "text-white" : "text-cyan-700 dark:text-cyan-300"}`}
                    />
                    <div>
                      <div className="text-base font-semibold leading-tight">{option.label}</div>
                      <div className={`text-xs leading-snug ${activeType === option.id ? "text-cyan-100" : "text-gray-500 dark:text-slate-400"}`}>
                        {option.id === "educational"
                          ? "Training and instructional videos"
                          : "General sport and event videos"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {error && (
              <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            )}

            {loading ? (
              <div className="py-16 text-center text-gray-500 dark:text-slate-400">Loading videos...</div>
            ) : videos.length === 0 ? (
              <div className="py-16 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                No {videoTypeLabel(activeType).toLowerCase()} found.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {videos.map((item) => (
                  <Link
                    key={item._id}
                    href={`/videos/${item.slug}`}
                    className="group relative flex flex-col bg-white dark:bg-slate-800 border border-gray-200/80 dark:border-slate-700/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-cyan-300/60 dark:hover:border-cyan-600/60 hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="aspect-[16/10] bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 overflow-hidden relative">
                      {item.thumbnail?.path ? (
                        <img
                          src={EP.assetUrl(item.thumbnail.path)}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Video className="w-10 h-10 opacity-30" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/95 text-cyan-700 shadow-lg">
                          <Play className="w-5 h-5 ml-0.5 fill-current" />
                        </span>
                      </div>
                      <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-sm px-2.5 py-1 text-[11px] font-medium text-white">
                        <VideoTypeIcon type={item.videoType} className="w-3.5 h-3.5 text-white" />
                        {videoTypeLabel(item.videoType)}
                      </div>
                    </div>
                    <div className="flex flex-col flex-1 p-3.5 space-y-2.5">
                      <div className="flex flex-wrap gap-1.5 text-[11px]">
                        {item.sportGroup?.name && (
                          <span className="px-2 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 font-medium">
                            {item.sportGroup.name}
                          </span>
                        )}
                        {item.sport?.name && (
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                            {item.sport.name}
                          </span>
                        )}
                      </div>
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-cyan-700 dark:group-hover:text-cyan-300 transition-colors">
                        {item.title}
                      </h2>
                      <p className="text-xs text-gray-600 dark:text-slate-400 line-clamp-2 leading-relaxed flex-1">
                        {item.excerpt}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-500 dark:text-slate-400 pt-1 border-t border-gray-100 dark:border-slate-700/80">
                        <span className="inline-flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <AuthorLink author={item.author} />
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(item.publishedAt)}
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
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
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
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
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

      {isVideosManageOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Videos</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Upload and manage educational or general videos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsVideosManageOpen(false)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                aria-label="Close videos"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(90vh-73px)]">
              <VideoManagement mode={user?.role === 0 ? "admin" : "coach"} embedded />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
        </div>
      }
    >
      <VideosPageContent />
    </Suspense>
  );
}
