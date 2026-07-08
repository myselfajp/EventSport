"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
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
  X,
} from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

type BlogMode = "admin" | "coach";
type BlogStatus = "draft" | "published";
type StatusFilter = BlogStatus | "all";

type SportGroup = {
  _id: string;
  name: string;
};

type Sport = {
  _id: string;
  name: string;
  group?: string;
};

type BlogPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content?: string;
  coverImage?: { path?: string; originalName?: string } | null;
  sportGroup?: SportGroup | string | null;
  sport?: Sport | string | null;
  author?: { name?: string; type?: string; coachId?: string | null };
  authorType?: "admin" | "coach";
  status: BlogStatus;
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

type BlogForm = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  sportGroup: string;
  sport: string;
  status: BlogStatus;
  isActive: boolean;
};

const EMPTY_FORM: BlogForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
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

function statusLabel(blog: BlogPost) {
  if (isPublicBlog(blog)) return "Published";
  if (!blog.isActive) return "Inactive";
  return blog.status === "published" ? "Published" : "Draft";
}

function isPublicBlog(blog: BlogPost) {
  return blog.status === "published" && blog.isActive;
}

function statusClass(blog: BlogPost) {
  if (isPublicBlog(blog)) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  }
  if (!blog.isActive) {
    return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  }
  if (blog.status === "published") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  }
  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900";
}

function getResponseMessage(response: ApiResponse, fallback: string) {
  return response.message || response.error || fallback;
}

async function parseApiResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const text = await res.text();
  if (!text) return { success: res.ok };
  try {
    return JSON.parse(text) as ApiResponse<T>;
  } catch {
    return { success: res.ok, message: text };
  }
}

async function fetchSportsForGroup(groupId: string): Promise<Sport[]> {
  if (!groupId) return [];
  const response = await fetchJSON(EP.REFERENCE.sport.get, {
    method: "POST",
    body: { perPage: 100, pageNumber: 1, groupId },
  });
  return response?.success && Array.isArray(response.data) ? response.data : [];
}

export default function BlogManagement({
  mode,
  embedded = false,
}: {
  mode: BlogMode;
  embedded?: boolean;
}) {
  const blogApi = mode === "admin" ? EP.ADMIN.blogs : EP.COACH.blogs;
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [filterSports, setFilterSports] = useState<Sport[]>([]);
  const [formSports, setFormSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    total: 0,
    perPage: 50,
  });
  const [filters, setFilters] = useState({
    search: "",
    sportGroup: "",
    sport: "",
    status: "all" as StatusFilter,
  });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const title = mode === "coach" ? "My Blogs" : "Blogs";

  useEffect(() => {
    return () => {
      if (coverPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

  useEffect(() => {
    let cancelled = false;
    const loadGroups = async () => {
      try {
        const response = await fetchJSON(EP.REFERENCE.sportGroup.get, {
          method: "POST",
          body: { perPage: 100, pageNumber: 1 },
        });
        if (!cancelled && response?.success && Array.isArray(response.data)) {
          setSportGroups(response.data);
        }
      } catch (err) {
        console.error("Failed to load sport groups:", err);
      }
    };
    void loadGroups();
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
    void fetchSportsForGroup(filters.sportGroup)
      .then((rows) => {
        if (!cancelled) setFilterSports(rows);
      })
      .catch((err) => {
        console.error("Failed to load sports:", err);
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
    void fetchSportsForGroup(form.sportGroup)
      .then((rows) => {
        if (!cancelled) setFormSports(rows);
      })
      .catch((err) => {
        console.error("Failed to load form sports:", err);
        if (!cancelled) setFormSports([]);
      });
    return () => {
      cancelled = true;
    };
  }, [form.sportGroup]);

  const loadBlogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchJSON(
        blogApi.list({
          page,
          limit: pagination.perPage,
          search: filters.search.trim() || undefined,
          sportGroup: filters.sportGroup || undefined,
          sport: filters.sport || undefined,
          status: filters.status,
        }),
        { method: "GET" }
      );

      if (response?.success && Array.isArray(response.data)) {
        setBlogs(response.data);
        setPagination({
          totalPages: response.pagination?.totalPages || 1,
          total: response.pagination?.total || response.data.length,
          perPage: response.pagination?.perPage || 50,
        });
      } else {
        setBlogs([]);
        setError(response?.message || response?.error || "Failed to load blogs");
      }
    } catch (err) {
      setBlogs([]);
      setError(err instanceof Error ? err.message : "Failed to load blogs");
    } finally {
      setLoading(false);
    }
  }, [blogApi, filters, page, pagination.perPage]);

  useEffect(() => {
    void loadBlogs();
  }, [loadBlogs]);

  const selectedFilterGroupName = useMemo(
    () => sportGroups.find((group) => group._id === filters.sportGroup)?.name || "",
    [filters.sportGroup, sportGroups]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setCoverPreviewUrl("");
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const openEdit = (blog: BlogPost) => {
    setEditing(blog);
    setForm({
      title: blog.title || "",
      slug: blog.slug || "",
      excerpt: blog.excerpt || "",
      content: blog.content || "",
      sportGroup: relationId(blog.sportGroup),
      sport: relationId(blog.sport),
      status: blog.status || "draft",
      isActive: blog.isActive !== false,
    });
    setCoverFile(null);
    setCoverPreviewUrl(blog.coverImage?.path ? EP.assetUrl(blog.coverImage.path) : "");
    setError("");
    setSuccess("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setCoverFile(null);
    setCoverPreviewUrl("");
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sportGroup" ? { sport: "" } : {}),
    }));
    setPage(1);
  };

  const updateForm = (key: keyof BlogForm, value: string | boolean) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "sportGroup" ? { sport: "" } : {}),
    }));
  };

  const resetFilters = () => {
    setFilters({ search: "", sportGroup: "", sport: "", status: "all" });
    setPage(1);
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    setCoverFile(file);
    if (file) {
      setCoverPreviewUrl(URL.createObjectURL(file));
    } else {
      setCoverPreviewUrl(editing?.coverImage?.path ? EP.assetUrl(editing.coverImage.path) : "");
    }
  };

  const validateForm = () => {
    if (form.title.trim().length < 3) return "Title must be at least 3 characters.";
    if (form.excerpt.trim().length < 10) return "Excerpt must be at least 10 characters.";
    if (form.content.trim().length < 30) return "Content must be at least 30 characters.";
    if (form.sportGroup && !form.sport) return "Select a sport when a sport group is chosen.";
    if (!form.sportGroup && form.sport) return "Select a sport group when a sport is chosen.";
    if (!editing && !coverFile) return "Cover image is required.";
    if (editing && !coverFile && !editing.coverImage?.path) return "Cover image is required.";
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
      content: form.content.trim(),
      sportGroup: form.sportGroup || undefined,
      sport: form.sport || undefined,
      status: form.status,
      isActive: form.isActive,
    };

    const body = new FormData();
    body.append("data", JSON.stringify(payload));
    if (coverFile) body.append("blog-cover-image", coverFile);

    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const res = await apiFetch(editing ? blogApi.update(editing._id) : blogApi.create, {
        method: editing ? "PUT" : "POST",
        headers: { Accept: "application/json" },
        body,
      });
      const response = await parseApiResponse<BlogPost>(res);
      if (!res.ok || response.success === false) {
        setError(getResponseMessage(response, "Failed to save blog"));
        return;
      }
      closeModal();
      setSuccess(editing ? "Blog updated." : "Blog created.");
      await loadBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save blog");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async (blog: BlogPost) => {
    const currentlyPublic = isPublicBlog(blog);

    if (currentlyPublic) {
      if (!confirm("Unpublish this blog post? It will no longer be visible publicly.")) {
        return;
      }
      try {
        setTogglingId(blog._id);
        setError("");
        setSuccess("");
        const body = new FormData();
        body.append("data", JSON.stringify({ status: "draft", isActive: false }));
        const res = await apiFetch(blogApi.update(blog._id), {
          method: "PUT",
          headers: { Accept: "application/json" },
          body,
        });
        const response = await parseApiResponse<BlogPost>(res);
        if (!res.ok || response.success === false) {
          setError(getResponseMessage(response, "Failed to unpublish blog"));
          return;
        }
        setSuccess("Blog unpublished.");
        await loadBlogs();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to unpublish blog");
      } finally {
        setTogglingId(null);
      }
      return;
    }

    if (!confirm("Publish this blog post? It will be visible on public blog pages.")) {
      return;
    }

    try {
      setTogglingId(blog._id);
      setError("");
      setSuccess("");
      const body = new FormData();
      body.append("data", JSON.stringify({ status: "published", isActive: true }));
      const res = await apiFetch(blogApi.update(blog._id), {
        method: "PUT",
        headers: { Accept: "application/json" },
        body,
      });
      const response = await parseApiResponse<BlogPost>(res);
      if (!res.ok || response.success === false) {
        setError(getResponseMessage(response, "Failed to publish blog"));
        return;
      }
      setSuccess("Blog published.");
      await loadBlogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish blog");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (blog: BlogPost) => {
    if (
      !confirm(
        `Delete "${blog.title}" permanently? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setDeletingId(blog._id);
      setError("");
      setSuccess("");
      const response = await fetchJSON(blogApi.delete(blog._id), { method: "DELETE" });
      if (response?.success) {
        setSuccess("Blog deleted.");
        await loadBlogs();
      } else {
        setError(response?.message || response?.error || "Failed to delete blog");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete blog");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className={embedded ? "space-y-5" : "space-y-6"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
            Create, edit, filter, and publish blog posts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadBlogs()}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Blog
          </button>
        </div>
      </div>

      {(error || success) && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            error
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"
          }`}
        >
          {error || success}
        </div>
      )}

      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2 shrink-0 pb-2 mr-1">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters</span>
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => updateFilter("search", e.target.value)}
              placeholder="Search title or content"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filters.status}
            onChange={(e) => updateFilter("status", e.target.value)}
            className="min-w-[130px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
            aria-label="Status"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
          <select
            value={filters.sportGroup}
            onChange={(e) => updateFilter("sportGroup", e.target.value)}
            className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white"
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
            onChange={(e) => updateFilter("sport", e.target.value)}
            className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white disabled:opacity-50"
            aria-label="Sport"
          >
            <option value="">
              {filters.sportGroup ? `All ${selectedFilterGroupName || "Sports"}` : "Select Sport Group first"}
            </option>
            {filterSports.map((sport) => (
              <option key={sport._id} value={sport._id}>
                {sport.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={resetFilters}
            className="px-3 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:underline shrink-0"
          >
            Clear
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            {pagination.total} blog{pagination.total === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-500">
            Page {page} of {pagination.totalPages}
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">
            <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />
            Loading blogs...
          </div>
        ) : blogs.length === 0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">
            No blogs found.
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {blogs.map((blog) => {
              const coverUrl = blog.coverImage?.path ? EP.assetUrl(blog.coverImage.path) : "";
              return (
                <article
                  key={blog._id}
                  className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center"
                >
                  <div className="w-full lg:w-32 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                    {coverUrl ? (
                      <img
                        src={coverUrl}
                        alt={blog.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${statusClass(blog)}`}
                      >
                        {statusLabel(blog)}
                      </span>
                      {relationName(blog.sportGroup) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">
                          {relationName(blog.sportGroup)}
                        </span>
                      )}
                      {relationName(blog.sport) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">
                          {relationName(blog.sport)}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-950 dark:text-white truncate">
                      {blog.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 line-clamp-2">
                      {blog.excerpt}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {formatDate(blog.publishedAt || blog.createdAt)}
                      </span>
                      <span>By {blog.author?.name || "EventSport"}</span>
                      <span>/{blog.slug}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isPublicBlog(blog) && (
                      <Link
                        href={`/blogs/${blog.slug}`}
                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(blog)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePublish(blog)}
                      disabled={togglingId === blog._id}
                      className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm disabled:opacity-50 ${
                        isPublicBlog(blog)
                          ? "border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30"
                          : "border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                      }`}
                    >
                      {togglingId === blog._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isPublicBlog(blog) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      {isPublicBlog(blog) ? "Unpublish" : "Publish"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(blog)}
                      disabled={deletingId === blog._id}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 text-sm disabled:opacity-50"
                    >
                      {deletingId === blog._id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-700">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">
                  {editing ? "Edit Blog" : "New Blog"}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  Cover image, category, and content are required.
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400"
                aria-label="Close blog form"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-73px)]">
              <div className="p-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Title
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => updateForm("title", e.target.value)}
                      maxLength={180}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="Training ideas for match day"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Slug (optional)
                    </label>
                    <input
                      value={form.slug}
                      onChange={(e) => updateForm("slug", e.target.value)}
                      maxLength={220}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                      placeholder="training-ideas-for-match-day"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Leave blank to auto-generate from the title. This becomes the URL path
                      (e.g. /blogs/your-slug).
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Excerpt
                    </label>
                    <textarea
                      value={form.excerpt}
                      onChange={(e) => updateForm("excerpt", e.target.value)}
                      maxLength={320}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y"
                      placeholder="Short summary shown on the blog card"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Content
                    </label>
                    <textarea
                      value={form.content}
                      onChange={(e) => updateForm("content", e.target.value)}
                      maxLength={20000}
                      rows={12}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y leading-7"
                      placeholder="Write the blog post content"
                    />
                  </div>
                </div>

                <aside className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Cover Image
                    </label>
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 overflow-hidden bg-gray-50 dark:bg-slate-800">
                      <div className="aspect-[16/10] flex items-center justify-center">
                        {coverPreviewUrl ? (
                          <img
                            src={coverPreviewUrl}
                            alt="Blog cover preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center text-gray-400 dark:text-slate-500">
                            <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                            <span className="text-sm">No image selected</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverChange}
                          className="block w-full text-sm text-gray-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Sport Group (optional)
                    </label>
                    <select
                      value={form.sportGroup}
                      onChange={(e) => updateForm("sportGroup", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="">Select Sport Group</option>
                      {sportGroups.map((group) => (
                        <option key={group._id} value={group._id}>
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Sport (optional)
                    </label>
                    <select
                      value={form.sport}
                      disabled={!form.sportGroup}
                      onChange={(e) => updateForm("sport", e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50"
                    >
                      <option value="">Select Sport</option>
                      {formSports.map((sport) => (
                        <option key={sport._id} value={sport._id}>
                          {sport.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as BlogStatus;
                        setForm((prev) => ({
                          ...prev,
                          status: newStatus,
                          isActive: newStatus === "published" ? true : prev.isActive,
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                    >
                      <option value="published">Published</option>
                      <option value="draft">Draft</option>
                    </select>
                  </div>

                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => updateForm("isActive", e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      <span className="block text-sm font-medium text-gray-800 dark:text-slate-200">
                        Active
                      </span>
                      <span className="block text-xs text-gray-500 dark:text-slate-400">
                        Inactive posts are hidden from public blog pages.
                      </span>
                    </span>
                  </label>
                </aside>
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/40">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium disabled:opacity-60"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editing ? "Save Changes" : "Create Blog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
