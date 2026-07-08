"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, User } from "lucide-react";
import Header from "@/components/Header";
import LeftSidebar from "@/components/LeftSidebar";
import RightSidebar from "@/components/RightSidebar";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  type VideoType,
  videoTypeLabel,
  youtubeEmbedUrl,
} from "@/app/lib/video-utils";
import { VideoTypeIcon } from "@/components/video/VideoTypeIcons";

type VideoItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  description: string;
  videoType: VideoType;
  thumbnail?: { path?: string } | null;
  videoFile?: { path?: string; mimeType?: string } | null;
  externalUrl?: string;
  sportGroup?: { _id: string; name: string } | null;
  sport?: { _id: string; name: string } | null;
  author?: { name: string; type: string };
  publishedAt?: string;
};

function formatDate(value?: string) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function VideoDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState("month");
  const [video, setVideo] = useState<VideoItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJSON(EP.PUBLIC.videoBySlug(slug), { method: "GET" }, { skipAuth: true });
        if (cancelled) return;
        if (res?.success && res.data) setVideo(res.data);
        else {
          setVideo(null);
          setError(res?.message || res?.error || "Video not found");
        }
      } catch (err) {
        if (!cancelled) {
          setVideo(null);
          setError(err instanceof Error ? err.message : "Video not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const embedUrl = useMemo(
    () => (video?.externalUrl ? youtubeEmbedUrl(video.externalUrl) : null),
    [video?.externalUrl]
  );

  const uploadedVideoUrl = video?.videoFile?.path ? EP.assetUrl(video.videoFile.path) : "";

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors duration-300">
      <LeftSidebar isOpen={leftSidebarOpen} />
      <div className="flex-1 flex flex-col min-h-0">
        <Header
          onLeftSidebarToggle={() => setLeftSidebarOpen(!leftSidebarOpen)}
          onRightSidebarToggle={() => setRightSidebarOpen(!rightSidebarOpen)}
        />
        <main className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <Link
              href="/videos"
              className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors mb-6"
            >
              Back to Videos
            </Link>

            {loading ? (
              <div className="py-20 text-center text-gray-500 dark:text-slate-400">Loading video...</div>
            ) : error || !video ? (
              <div className="py-20 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">
                {error || "Video not found"}
              </div>
            ) : (
              <article className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="aspect-video bg-black">
                  {embedUrl ? (
                    <iframe
                      src={embedUrl}
                      title={video.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : uploadedVideoUrl ? (
                    <video
                      src={uploadedVideoUrl}
                      controls
                      playsInline
                      poster={video.thumbnail?.path ? EP.assetUrl(video.thumbnail.path) : undefined}
                      className="w-full h-full"
                    />
                  ) : video.thumbnail?.path ? (
                    <img
                      src={EP.assetUrl(video.thumbnail.path)}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="p-5 sm:p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2 text-xs">
                      {video.sportGroup?.name && (
                        <span className="px-2 py-1 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300">
                          {video.sportGroup.name}
                        </span>
                      )}
                      {video.sport?.name && (
                        <span className="px-2 py-1 rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
                          {video.sport.name}
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 inline-flex items-center gap-1.5">
                        <VideoTypeIcon type={video.videoType} className="w-3.5 h-3.5 text-violet-700 dark:text-violet-300" />
                        {videoTypeLabel(video.videoType)}
                      </span>
                    </div>
                    <h1 className="text-3xl sm:text-4xl font-bold text-gray-950 dark:text-white leading-tight">
                      {video.title}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">{video.excerpt}</p>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-gray-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1.5">
                        <User className="w-4 h-4" />
                        {video.author?.name || "EventSport Team"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="w-4 h-4" />
                        {formatDate(video.publishedAt)}
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-slate-700 pt-6">
                    <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-gray-800 dark:text-slate-100 leading-8">
                      {video.description}
                    </div>
                  </div>
                </div>
              </article>
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
    </div>
  );
}
