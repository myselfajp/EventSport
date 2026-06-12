"use client";

import { useState, useEffect } from "react";
import { fetchJSON, apiFetch } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { Plus, Trash2, Edit2, Save, X, Layers, ImageIcon, BarChart3 } from "lucide-react";
import DashboardHeroStatistics from "./DashboardHeroStatistics";

interface HeroSlide {
  _id: string;
  badgeLabel: string;
  title: string;
  subtitle: string;
  imageAlt?: string;
  image?: { path: string; mimeType?: string };
  ctaLabel: string;
  ctaHref: string;
  ctaRequiresAdminRole: boolean;
  isActive: boolean;
  order: number;
  clickCount?: number;
  lastClickedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm = {
  badgeLabel: "",
  title: "",
  subtitle: "",
  imageAlt: "",
  ctaLabel: "",
  ctaHref: "",
  ctaRequiresAdminRole: false,
  isActive: true,
  order: 0,
};

function slideThumbUrl(s: HeroSlide) {
  if (!s.image?.path) return null;
  return EP.assetUrl(s.image.path);
}

function formatSlideDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("tr-TR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

type HeroSection = "slides" | "statistics";

export default function DashboardHeroManagement() {
  const [section, setSection] = useState<HeroSection>("slides");
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!imageFile) {
      setPreviewBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(imageFile);
    setPreviewBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeroSlides.list, {
        method: "GET",
      });
      if (res?.success && Array.isArray(res.data)) {
        setSlides(res.data as HeroSlide[]);
      } else {
        setError(res?.message || res?.error || "Failed to load slides");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load slides");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    setRemoveImage(false);
    setForm({
      ...emptyForm,
      order: slides.length ? Math.max(...slides.map((s) => s.order)) + 1 : 0,
    });
    setShowModal(true);
  };

  const openEdit = (s: HeroSlide) => {
    setEditing(s);
    setImageFile(null);
    setRemoveImage(false);
    setForm({
      badgeLabel: s.badgeLabel || "",
      title: s.title || "",
      subtitle: s.subtitle || "",
      imageAlt: s.imageAlt || "",
      ctaLabel: s.ctaLabel || "",
      ctaHref: s.ctaHref || "",
      ctaRequiresAdminRole: !!s.ctaRequiresAdminRole,
      isActive: s.isActive !== false,
      order: s.order ?? 0,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this slide?")) return;
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeroSlides.delete(id), {
        method: "DELETE",
      });
      if (res?.success) await load();
      else setError(res?.message || res?.error || "Delete failed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");

      const hasExistingImage = !!(editing?.image?.path && !removeImage);
      const hasContent =
        form.title.trim() ||
        form.subtitle.trim() ||
        imageFile ||
        hasExistingImage;

      if (!hasContent) {
        setError("Add an image and/or title or subtitle (at least one).");
        return;
      }

      const payload: Record<string, unknown> = {
        badgeLabel: form.badgeLabel,
        title: form.title,
        subtitle: form.subtitle,
        imageAlt: form.imageAlt,
        ctaLabel: form.ctaLabel || "",
        ctaHref: form.ctaHref || "",
        ctaRequiresAdminRole: form.ctaRequiresAdminRole,
        isActive: form.isActive,
        order: form.order,
      };

      if (editing && removeImage) {
        payload.removeImage = true;
      }

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (imageFile) {
        fd.append("hero-slide-image", imageFile);
      }

      const url = editing
        ? EP.ADMIN.dashboardHeroSlides.update(editing._id)
        : EP.ADMIN.dashboardHeroSlides.create;

      const res = await apiFetch(url, {
        method: editing ? "PUT" : "POST",
        body: fd,
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setShowModal(false);
        setImageFile(null);
        setRemoveImage(false);
        await load();
      } else {
        setError(data?.message || data?.error || "Save failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    }
  };

  if (section === "statistics") {
    return (
      <div className="space-y-4">
        <nav className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
          <button
            type="button"
            onClick={() => setSection("slides")}
            className="px-4 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            Slides
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200"
          >
            Statistics
          </button>
        </nav>
        <DashboardHeroStatistics />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <nav className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
        <button
          type="button"
          className="px-4 py-2 text-sm font-medium rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200"
        >
          Slides
        </button>
        <button
          type="button"
          onClick={() => setSection("statistics")}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
        >
          <BarChart3 className="w-4 h-4" />
          Statistics
        </button>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
          <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold">Home dashboard hero</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Upload campaign banners or text-only slides. Use{" "}
              <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1 rounded">
                {"{{firstName}}"}
              </code>{" "}
              in the title. CTA links are tracked via redirect (clicks counted). Multiple slides
              appear as a carousel on the home dashboard.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Add slide
        </button>
      </div>

      {!loading && slides.length > 0 ? (
        <div className="rounded-lg border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/70 dark:bg-cyan-950/30 px-4 py-2 text-sm text-cyan-950 dark:text-cyan-100">
          <strong>{slides.length}</strong> slides ·{" "}
          <strong>{slides.filter((s) => s.isActive).length}</strong> active ·{" "}
          <strong>{slides.reduce((n, s) => n + (s.clickCount ?? 0), 0)}</strong> total clicks
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : slides.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400 py-6">
          No slides yet; the site shows the default banner. Add a slide with an image and/or text.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-left">
              <tr>
                <th className="px-3 py-3 font-medium text-gray-600 dark:text-slate-300 w-16">
                  Img
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Order</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Title</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Added</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Active</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Clicks</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">Link</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300 w-32">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {[...slides]
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((s) => {
                  const turl = slideThumbUrl(s);
                  return (
                    <tr key={s._id} className="bg-white dark:bg-slate-900/40">
                      <td className="px-3 py-2">
                        {turl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={turl}
                            alt=""
                            className="w-14 h-10 rounded object-cover bg-slate-200 dark:bg-slate-700"
                          />
                        ) : (
                          <div className="w-14 h-10 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100">{s.order}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100 max-w-md truncate">
                        {s.title || (
                          <span className="text-slate-400 italic">(image / text)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatSlideDate(s.createdAt)}
                      </td>
                      <td className="px-4 py-3">{s.isActive ? "Yes" : "No"}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-slate-100 tabular-nums">
                        {s.clickCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-slate-400 max-w-[140px] truncate">
                        {s.ctaHref ? (
                          <span title={s.ctaHref}>{s.ctaHref}</span>
                        ) : (
                          <span className="italic text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            className="p-2 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/50"
                            aria-label="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(s._id)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                            aria-label="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {showModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-slate-700">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Edit slide" : "New slide"}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Banner image (JPEG / PNG / WebP)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="w-full text-sm text-gray-600 dark:text-slate-400"
                  onChange={(e) => {
                    setImageFile(e.target.files?.[0] ?? null);
                    setRemoveImage(false);
                  }}
                />
                {editing?.image?.path && (
                  <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={removeImage}
                      onChange={(e) => {
                        setRemoveImage(e.target.checked);
                        if (e.target.checked) setImageFile(null);
                      }}
                    />
                    Remove current image
                  </label>
                )}
                {(previewBlobUrl || (editing?.image?.path && !removeImage)) && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        previewBlobUrl ||
                        EP.assetUrl(editing!.image!.path)
                      }
                      alt=""
                      className="w-full max-h-48 object-contain"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Image description (accessibility)
                </label>
                <input
                  type="text"
                  value={form.imageAlt}
                  onChange={(e) => setForm((f) => ({ ...f, imageAlt: e.target.value }))}
                  placeholder="Campaign banner"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Badge (optional, empty = hidden)
                </label>
                <input
                  type="text"
                  value={form.badgeLabel}
                  onChange={(e) => setForm((f) => ({ ...f, badgeLabel: e.target.value }))}
                  placeholder="KAMPANYA"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Welcome back, {{firstName}}!"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Subtitle (optional)
                </label>
                <textarea
                  rows={3}
                  value={form.subtitle}
                  onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Button label (optional)
                  </label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Destination link (tracked)
                  </label>
                  <input
                    type="text"
                    value={form.ctaHref}
                    onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                    placeholder="/events or https://partner.com"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.ctaRequiresAdminRole}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaRequiresAdminRole: e.target.checked }))
                  }
                />
                Button only for admins (role 0)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Sort order
                  </label>
                  <input
                    type="number"
                    value={form.order}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, order: Number(e.target.value) || 0 }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
                  />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm text-gray-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
