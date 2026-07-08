"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  ImageIcon,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  VIDEO_TYPE_OPTIONS,
  type VideoType,
  videoTypeLabel,
} from "@/app/lib/video-utils";
import { VideoTypeIcon } from "@/components/video/VideoTypeIcons";

type VideoMode = "admin" | "coach";
type VideoStatus = "draft" | "published";
type StatusFilter = VideoStatus | "all";

type SportGroup = { _id: string; name: string };
type Sport = { _id: string; name: string; group?: string };

type VideoItem = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  description?: string;
  videoType: VideoType;
  thumbnail?: { path?: string; originalName?: string } | null;
  videoFile?: { path?: string; originalName?: string; mimeType?: string } | null;
  externalUrl?: string;
  sportGroup?: SportGroup | string | null;
  sport?: Sport | string | null;
  author?: { name?: string; type?: string; coachId?: string | null };
  authorType?: "admin" | "coach";
  status: VideoStatus;
  isActive: boolean;
  publishedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type ApiResponse<T = unknown> = {
  success?: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    currentPage?: number;
    totalPages?: number;
    total?: number;
    perPage?: number;
  };
};

type VideoForm = {
  title: string;
  slug: string;
  excerpt: string;
  description: string;
  videoType: VideoType;
  externalUrl: string;
  sportGroup: string;
  sport: string;
  status: VideoStatus;
  isActive: boolean;
};

const EMPTY_FORM: VideoForm = {
  title: "",
  slug: "",
  excerpt: "",
  description: "",
  videoType: "educational",
  externalUrl: "",
  sportGroup: "",
  sport: "",
  status: "published",
  isActive: true,
};

function relationId(value: SportGroup | Sport | string | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? value : value._id || "";
}

function relationName(value: SportGroup | Sport | string | null | undefined) {
  if (!value) return "";
  return typeof value === "string" ? "" : value.name || "";
}

function formatDate(value?: string | null) {
  if (!value) return "Not published";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isPublicVideo(item: VideoItem) {
  return item.status === "published" && item.isActive;
}

function statusLabel(item: VideoItem) {
  if (isPublicVideo(item)) return "Published";
  if (!item.isActive) return "Inactive";
  return item.status === "published" ? "Published" : "Draft";
}

function statusClass(item: VideoItem) {
  if (isPublicVideo(item)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (!item.isActive) {
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  }
  if (item.status === "published") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  }
  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900";
}

function getMsg(response: ApiResponse, fallback: string) {
  return response.message || response.error || fallback;
}

async function parseResp<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { success: res.ok };
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return { success: res.ok, message: text };
  }
}

async function fetchSports(groupId: string): Promise<Sport[]> {
  if (!groupId) return [];
  const res = await fetchJSON(EP.REFERENCE.sport.get, {
    method: "POST",
    body: { perPage: 100, pageNumber: 1, groupId },
  });
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export default function VideoManagement({
  mode,
  embedded = false,
}: {
  mode: VideoMode;
  embedded?: boolean;
}) {
  const videoApi = mode === "admin" ? EP.ADMIN.videos : EP.COACH.videos;

  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [filterSports, setFilterSports] = useState<Sport[]>([]);
  const [formSports, setFormSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, perPage: 50 });
  const [filters, setFilters] = useState({
    search: "",
    sportGroup: "",
    sport: "",
    videoType: "" as "" | VideoType,
    status: "all" as StatusFilter,
  });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<VideoItem | null>(null);
  const [form, setForm] = useState<VideoForm>(EMPTY_FORM);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (thumbnailPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(thumbnailPreviewUrl);
    };
  }, [thumbnailPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    fetchJSON(EP.REFERENCE.sportGroup.get, {
      method: "POST",
      body: { perPage: 100, pageNumber: 1 },
    })
      .then((res) => {
        if (!cancelled && res?.success && Array.isArray(res.data)) setSportGroups(res.data);
      })
      .catch((err) => console.error("sport groups:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!filters.sportGroup) {
      setFilterSports([]);
      setFilters((prev) => (prev.sport ? { ...prev, sport: "" } : prev));
      return;
    }
    fetchSports(filters.sportGroup)
      .then((rows) => {
        if (!cancelled) setFilterSports(rows);
      })
      .catch(() => {
        if (!cancelled) setFilterSports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.sportGroup]);

  useEffect(() => {
    let cancelled = false;
    if (!form.sportGroup) {
      setFormSports([]);
      return;
    }
    fetchSports(form.sportGroup)
      .then((rows) => {
        if (!cancelled) setFormSports(rows);
      })
      .catch(() => {
        if (!cancelled) setFormSports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.sportGroup]);

  const loadVideos = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(
        videoApi.list({
          page,
          limit: pagination.perPage,
          search: filters.search.trim() || undefined,
          sportGroup: filters.sportGroup || undefined,
          sport: filters.sport || undefined,
          videoType: filters.videoType || undefined,
          status: filters.status,
        }),
        { method: "GET" }
      );
      if (res?.success && Array.isArray(res.data)) {
        setVideos(res.data);
        setPagination({
          totalPages: res.pagination?.totalPages || 1,
          total: res.pagination?.total || res.data.length,
          perPage: res.pagination?.perPage || 50,
        });
      } else {
        setVideos([]);
        setError(res?.message || res?.error || "Failed to load videos");
      }
    } catch (err) {
      setVideos([]);
      setError(err instanceof Error ? err.message : "Failed to load videos");
    } finally {
      setLoading(false);
    }
  }, [videoApi, filters, page, pagination.perPage]);

  useEffect(() => {
    void loadVideos();
  }, [loadVideos]);

  const selectedGroupName = useMemo(
    () => sportGroups.find((group) => group._id === filters.sportGroup)?.name || "",
    [filters.sportGroup, sportGroups]
  );

  const openCreate = (videoType?: VideoType) => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, videoType: videoType || "educational" });
    setThumbnailFile(null);
    setThumbnailPreviewUrl("");
    setVideoFile(null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (item: VideoItem) => {
    setEditing(item);
    setForm({
      title: item.title || "",
      slug: item.slug || "",
      excerpt: item.excerpt || "",
      description: item.description || "",
      videoType: item.videoType || "educational",
      externalUrl: item.externalUrl || "",
      sportGroup: relationId(item.sportGroup),
      sport: relationId(item.sport),
      status: item.status || "draft",
      isActive: item.isActive !== false,
    });
    setThumbnailFile(null);
    setThumbnailPreviewUrl(item.thumbnail?.path ? EP.assetUrl(item.thumbnail.path) : "");
    setVideoFile(null);
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setThumbnailFile(null);
    setThumbnailPreviewUrl("");
    setVideoFile(null);
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sportGroup" ? { sport: "" } : {}),
    }));
    setPage(1);
  };

  const updateForm = (key: keyof VideoForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sportGroup" ? { sport: "" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({ search: "", sportGroup: "", sport: "", videoType: "", status: "all" });
    setPage(1);
  };

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setThumbnailFile(file);
    if (file) {
      setThumbnailPreviewUrl(URL.createObjectURL(file));
    } else {
      setThumbnailPreviewUrl(editing?.thumbnail?.path ? EP.assetUrl(editing.thumbnail.path) : "");
    }
  };

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoFile(event.target.files?.[0] || null);
    if (event.target.files?.[0]) {
      setForm((prev) => ({ ...prev, externalUrl: "" }));
    }
  };

  const validateForm = () => {
    if (form.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (form.excerpt.trim().length < 10) return "Excerpt must be at least 10 characters.";
    if (form.description.trim().length < 10) return "Description must be at least 10 characters.";
    if (form.sportGroup && !form.sport) return "Select a sport when a sport group is chosen.";
    if (!form.sportGroup && form.sport) return "Select a sport group when a sport is chosen.";
    if (!editing && !thumbnailFile) return "Thumbnail image is required.";
    if (editing && !thumbnailFile && !editing.thumbnail?.path) return "Thumbnail image is required.";
    if (!editing && !videoFile && !form.externalUrl.trim()) {
      return "Upload a video file or provide an external URL.";
    }
    if (editing && !videoFile && !form.externalUrl.trim() && !editing.videoFile?.path && !editing.externalUrl) {
      return "Upload a video file or provide an external URL.";
    }
    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      title: form.title.trim(),
      slug: form.slug.trim(),
      excerpt: form.excerpt.trim(),
      description: form.description.trim(),
      videoType: form.videoType,
      externalUrl: videoFile ? "" : form.externalUrl.trim(),
      sportGroup: form.sportGroup || undefined,
      sport: form.sport || undefined,
      status: form.status,
      isActive: form.isActive,
    };

    const body = new FormData();
    body.append("data", JSON.stringify(payload));
    if (thumbnailFile) body.append("video-thumbnail", thumbnailFile);
    if (videoFile) body.append("video-file", videoFile);

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await apiFetch(editing ? videoApi.update(editing._id) : videoApi.create, {
        method: editing ? "PUT" : "POST",
        headers: { Accept: "application/json" },
        body,
      });
      const response = await parseResp<VideoItem>(res);
      if (!res.ok || response.success === false) {
        setError(getMsg(response, "Failed to save video"));
        return;
      }
      closeModal();
      setSuccess(editing ? "Video updated." : "Video created.");
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save video");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (item: VideoItem) => {
    const currentlyPublic = isPublicVideo(item);

    if (currentlyPublic) {
      if (!confirm("Unpublish this video? It will no longer be visible publicly.")) return;
      try {
        setTogglingId(item._id);
        setError("");
        setSuccess("");
        const body = new FormData();
        body.append("data", JSON.stringify({ status: "draft", isActive: false }));
        const res = await apiFetch(videoApi.update(item._id), {
          method: "PUT",
          headers: { Accept: "application/json" },
          body,
        });
        const response = await parseResp<VideoItem>(res);
        if (!res.ok || response.success === false) {
          setError(getMsg(response, "Failed to unpublish video"));
          return;
        }
        setSuccess("Video unpublished.");
        await loadVideos();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unpublish video");
      } finally {
        setTogglingId(null);
      }
      return;
    }

    if (!confirm("Publish this video? It will be visible on public video pages.")) return;
    try {
      setTogglingId(item._id);
      setError("");
      setSuccess("");
      const body = new FormData();
      body.append("data", JSON.stringify({ status: "published", isActive: true }));
      const res = await apiFetch(videoApi.update(item._id), {
        method: "PUT",
        headers: { Accept: "application/json" },
        body,
      });
      const response = await parseResp<VideoItem>(res);
      if (!res.ok || response.success === false) {
        setError(getMsg(response, "Failed to publish video"));
        return;
      }
      setSuccess("Video published.");
      await loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish video");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (item: VideoItem) => {
    if (!confirm(`Delete "${item.title}" permanently? This action cannot be undone.`)) return;

    try {
      setDeletingId(item._id);
      setError("");
      setSuccess("");
      const res = await fetchJSON(videoApi.delete(item._id), { method: "DELETE" });
      if (res?.success) {
        setSuccess("Video deleted.");
        await loadVideos();
      } else {
        setError(res?.message || res?.error || "Failed to delete video");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete video");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Videos</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Upload educational or normal videos. Coaches and admins can manage their own uploads.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => void loadVideos()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => openCreate()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Video
          </button>
        </div>
      </div>

      {success && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}
      {error && !showModal && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 shrink-0 mr-1">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters</span>
          </div>
          <button
            type="button"
            onClick={resetFilters}
            className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
              !filters.search && !filters.sportGroup && !filters.sport && !filters.videoType && filters.status === "all"
                ? "bg-cyan-600 text-white border-cyan-600"
                : "bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600"
            }`}
          >
            All
          </button>
          {VIDEO_TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updateFilter("videoType", filters.videoType === option.id ? "" : option.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors shrink-0 ${
                filters.videoType === option.id
                  ? "bg-cyan-600 text-white border-cyan-600"
                  : "bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600"
              }`}
            >
              <VideoTypeIcon type={option.id} className="w-4 h-4 shrink-0 text-cyan-700 dark:text-cyan-300" />
              {option.label}
            </button>
          ))}
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={(event) => updateFilter("search", event.target.value)}
              placeholder="Search videos"
              className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filters.sportGroup}
            onChange={(event) => updateFilter("sportGroup", event.target.value)}
            className="min-w-[150px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            aria-label="Sport Group"
          >
            <option value="">All Sport Groups</option>
            {sportGroups.map((group) => (
              <option key={group._id} value={group._id}>
                {group.name}
              </option>
            ))}
          </select>
          <select
            value={filters.sport}
            disabled={!filters.sportGroup}
            onChange={(event) => updateFilter("sport", event.target.value)}
            className="min-w-[130px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white disabled:opacity-50"
            aria-label="Sport"
          >
            <option value="">All Sports</option>
            {filterSports.map((sport) => (
              <option key={sport._id} value={sport._id}>
                {sport.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className="min-w-[120px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          {selectedGroupName && (
            <span className="inline-flex items-center px-3 py-2 rounded-lg text-sm bg-cyan-50 dark:bg-cyan-950/30 text-cyan-800 dark:text-cyan-200 border border-cyan-200 dark:border-cyan-800 shrink-0">
              {selectedGroupName}
            </span>
          )}
        </div>
      </section>

      {loading ? (
        <div className="py-12 text-center text-gray-500 dark:text-slate-400">
          <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
          Loading videos...
        </div>
      ) : videos.length === 0 ? (
        <div className="py-16 text-center rounded-xl border border-dashed border-gray-300 dark:border-slate-700 text-gray-500 dark:text-slate-400">
          No videos found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-900/60 text-left text-gray-600 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">Thumb</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Published</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((item) => (
                <tr key={item._id} className="border-t border-gray-100 dark:border-slate-700">
                  <td className="px-4 py-3">
                    {item.thumbnail?.path ? (
                      <img
                        src={EP.assetUrl(item.thumbnail.path)}
                        alt={item.title}
                        className="w-16 h-10 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-10 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <VideoTypeIcon type={item.videoType} className="w-5 h-5 shrink-0 text-cyan-700 dark:text-cyan-300" />
                      {videoTypeLabel(item.videoType)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{item.title}</div>
                    <div className="text-xs text-gray-500 dark:text-slate-400 line-clamp-1">{item.excerpt}</div>
                  </td>
                  <td className="px-4 py-3">{item.author?.name || "EventSport Team"}</td>
                  <td className="px-4 py-3">{formatDate(item.publishedAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs border ${statusClass(item)}`}>
                      {statusLabel(item)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {isPublicVideo(item) && (
                        <Link
                          href={`/videos/${item.slug}`}
                          className="p-2 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30"
                          aria-label="View video"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(item)}
                        disabled={togglingId === item._id}
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 disabled:opacity-50"
                        aria-label={isPublicVideo(item) ? "Unpublish video" : "Publish video"}
                      >
                        {togglingId === item._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isPublicVideo(item) ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        aria-label="Edit video"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        disabled={deletingId === item._id}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50"
                        aria-label="Delete video"
                      >
                        {deletingId === item._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full ${embedded ? "max-w-3xl" : "max-w-4xl"} max-h-[90vh] overflow-hidden border border-gray-200 dark:border-slate-700`}>
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editing ? "Edit Video" : "Add Video"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Choose educational or normal type, upload a thumbnail, and add a video file or external URL.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto max-h-[calc(90vh-73px)] space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {VIDEO_TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateForm("videoType", option.id)}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                      form.videoType === option.id
                        ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-950/30"
                        : "border-gray-200 dark:border-slate-700 hover:border-cyan-300"
                    }`}
                  >
                    <VideoTypeIcon
                      type={option.id}
                      className={`w-8 h-8 shrink-0 ${form.videoType === option.id ? "text-cyan-700 dark:text-cyan-300" : "text-gray-600 dark:text-slate-300"}`}
                    />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">{option.label}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">
                        {option.id === "educational" ? "Training and instructional content" : "General video content"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Title</span>
                  <input
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    required
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Slug</span>
                  <input
                    value={form.slug}
                    onChange={(event) => updateForm("slug", event.target.value)}
                    placeholder="auto-generated if empty"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-500 dark:text-slate-400">
                    URL-friendly identifier. Leave empty to auto-generate from the title.
                  </span>
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Excerpt</span>
                <textarea
                  value={form.excerpt}
                  onChange={(event) => updateForm("excerpt", event.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  required
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => updateForm("description", event.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  required
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Sport Group</span>
                  <select
                    value={form.sportGroup}
                    onChange={(event) => updateForm("sportGroup", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="">Optional</option>
                    {sportGroups.map((group) => (
                      <option key={group._id} value={group._id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Sport</span>
                  <select
                    value={form.sport}
                    disabled={!form.sportGroup}
                    onChange={(event) => updateForm("sport", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50"
                  >
                    <option value="">Optional</option>
                    {formSports.map((sport) => (
                      <option key={sport._id} value={sport._id}>
                        {sport.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Thumbnail</span>
                  <input type="file" accept="image/*" onChange={handleThumbnailChange} />
                  {thumbnailPreviewUrl && (
                    <img src={thumbnailPreviewUrl} alt="Thumbnail preview" className="w-full max-w-xs h-28 object-cover rounded-lg border" />
                  )}
                </label>
                <div className="space-y-3">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Video file</span>
                    <input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={handleVideoFileChange} />
                    {editing?.videoFile?.path && !videoFile && (
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        Current file: {editing.videoFile.originalName || "uploaded video"}
                      </p>
                    )}
                  </label>
                  <label className="block space-y-1">
                    <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Or external URL</span>
                    <input
                      value={form.externalUrl}
                      onChange={(event) => updateForm("externalUrl", event.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={!!videoFile}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-gray-700 dark:text-slate-200">Status</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 pt-7">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm("isActive", event.target.checked)}
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-200">Active</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save changes" : "Create video"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
