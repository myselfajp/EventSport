"use client";

import { useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { fetchJSON, apiFetch } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { Plus, Trash2, Edit2, Save, X, Layers, ImageIcon, BarChart3, Crop } from "lucide-react";
import DashboardHeroStatistics from "./DashboardHeroStatistics";
import DashboardHeaderLogoManagement from "./DashboardHeaderLogoManagement";

/** Hero banner output — matches DashboardHeroSlider locked height */
export const BANNER_OUTPUT_WIDTH = 1200;
export const BANNER_OUTPUT_HEIGHT = 350;
const BANNER_ASPECT = BANNER_OUTPUT_WIDTH / BANNER_OUTPUT_HEIGHT;

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image load failed"));
    image.src = src;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, filename = "banner.jpg"): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas toBlob failed"));
        resolve(new File([blob], filename, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.88,
    );
  });
}

/** object-fit: contain — entire image inside banner (logos / vertical art) */
async function resizeImageContainToBanner(imageSrc: string): Promise<File> {
  const image = await loadImageElement(imageSrc);
  const tw = BANNER_OUTPUT_WIDTH;
  const th = BANNER_OUTPUT_HEIGHT;
  const sw = image.naturalWidth;
  const sh = image.naturalHeight;
  const scale = Math.min(tw / sw, th / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (tw - dw) / 2;
  const dy = (th - dh) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, tw, th);
  ctx.drawImage(image, dx, dy, dw, dh);
  return canvasToJpegFile(canvas);
}

/** Canvas output from manual crop selection (still normalized to banner size) */
async function cropImageToBlob(imageSrc: string, pixelCrop: Area): Promise<File> {
  const image = await loadImageElement(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = BANNER_OUTPUT_WIDTH;
  canvas.height = BANNER_OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    BANNER_OUTPUT_WIDTH,
    BANNER_OUTPUT_HEIGHT,
  );
  return canvasToJpegFile(canvas);
}

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

type HeroSection = "slides" | "statistics" | "logo";
type HeroPageContext = "home" | "blog" | "news" | "videos";

const HERO_PAGE_OPTIONS: { id: HeroPageContext; label: string; description: string }[] = [
  {
    id: "home",
    label: "Home",
    description: "Carousel on the main dashboard home page.",
  },
  {
    id: "blog",
    label: "Blog",
    description: "Banner at the top of the public blogs listing page.",
  },
  {
    id: "news",
    label: "News",
    description: "Banner at the top of the public news listing page.",
  },
  {
    id: "videos",
    label: "Videos",
    description: "Banner at the top of the public videos listing page.",
  },
];

function HeroPageNav({
  pageContext,
  onPageContextChange,
}: {
  pageContext: HeroPageContext;
  onPageContextChange: (ctx: HeroPageContext) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {HERO_PAGE_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onPageContextChange(option.id)}
          className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            pageContext === option.id
              ? "bg-cyan-600 text-white border-cyan-600"
              : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function HeroSectionNav({
  section,
  onSectionChange,
}: {
  section: HeroSection;
  onSectionChange: (s: HeroSection) => void;
}) {
  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg ${
      active
        ? "bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-200"
        : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
    }`;

  return (
    <nav className="flex gap-2 border-b border-gray-200 dark:border-slate-700 pb-3">
      <button
        type="button"
        onClick={() => onSectionChange("slides")}
        className={tabClass(section === "slides")}
      >
        Slides
      </button>
      <button
        type="button"
        onClick={() => onSectionChange("statistics")}
        className={tabClass(section === "statistics")}
      >
        <BarChart3 className="w-4 h-4" />
        Statistics
      </button>
      <button
        type="button"
        onClick={() => onSectionChange("logo")}
        className={tabClass(section === "logo")}
      >
        <ImageIcon className="w-4 h-4" />
        Logo
      </button>
    </nav>
  );
}

export default function DashboardHeroManagement() {
  const [section, setSection] = useState<HeroSection>("slides");
  const [pageContext, setPageContext] = useState<HeroPageContext>("home");
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HeroSlide | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  /** Kırpılmış nihai dosya — backend'e bu gönderilir */
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  /** Kırpılmış dosyanın önizleme URL'i */
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  /** Crop modal durumu */
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropLoading, setCropLoading] = useState(false);
  const [imageProcessing, setImageProcessing] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;
    try {
      setCropLoading(true);
      const file = await cropImageToBlob(cropSrc, croppedAreaPixels);
      setProcessedBannerFile(file);
      setShowCropModal(false);
    } catch (e) {
      console.error("Crop failed:", e);
    } finally {
      setCropLoading(false);
    }
  };

  const resetCrop = () => {
    setCroppedFile(null);
    if (croppedPreviewUrl) { URL.revokeObjectURL(croppedPreviewUrl); setCroppedPreviewUrl(null); }
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    setImageFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const setProcessedBannerFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    setCroppedFile(file);
    setCroppedPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return previewUrl;
    });
  };

  const handleBannerFileSelect = async (file: File) => {
    setImageFile(file);
    setRemoveImage(false);
    setError("");
    setCroppedFile(null);
    if (croppedPreviewUrl) {
      URL.revokeObjectURL(croppedPreviewUrl);
      setCroppedPreviewUrl(null);
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    const originalUrl = URL.createObjectURL(file);
    setCropSrc(originalUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropModal(false);

    try {
      setImageProcessing(true);
      const fittedFile = await resizeImageContainToBanner(originalUrl);
      setProcessedBannerFile(fittedFile);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fit image");
      setShowCropModal(true);
    } finally {
      setImageProcessing(false);
    }
  };

  const handleFitEntireImage = async () => {
    if (!cropSrc) return;
    try {
      setImageProcessing(true);
      setError("");
      const file = await resizeImageContainToBanner(cropSrc);
      setProcessedBannerFile(file);
      setShowCropModal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fit image");
    } finally {
      setImageProcessing(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeroSlides.list(pageContext), {
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
  }, [pageContext]);

  const activePage = HERO_PAGE_OPTIONS.find((option) => option.id === pageContext)!;

  const openCreate = () => {
    setEditing(null);
    setImageFile(null);
    setCroppedFile(null);
    if (croppedPreviewUrl) { URL.revokeObjectURL(croppedPreviewUrl); setCroppedPreviewUrl(null); }
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
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
    setCroppedFile(null);
    if (croppedPreviewUrl) { URL.revokeObjectURL(croppedPreviewUrl); setCroppedPreviewUrl(null); }
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
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
        croppedFile ||
        hasExistingImage;

      if (!hasContent) {
        setError("Add an image and/or title or subtitle (at least one).");
        return;
      }

      if (imageFile && !croppedFile) {
        setError("Wait for the banner image to finish fitting before saving.");
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
        context: pageContext,
      };

      if (editing && removeImage) {
        payload.removeImage = true;
      }

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (croppedFile) {
        fd.append("hero-slide-image", croppedFile);
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
        setCroppedFile(null);
        if (croppedPreviewUrl) { URL.revokeObjectURL(croppedPreviewUrl); setCroppedPreviewUrl(null); }
        if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
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
        <HeroSectionNav section={section} onSectionChange={setSection} />
        <HeroPageNav pageContext={pageContext} onPageContextChange={setPageContext} />
        <DashboardHeroStatistics context={pageContext} />
      </div>
    );
  }

  if (section === "logo") {
    return (
      <div className="space-y-4">
        <HeroSectionNav section={section} onSectionChange={setSection} />
        <DashboardHeaderLogoManagement />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeroSectionNav section={section} onSectionChange={setSection} />
      <HeroPageNav pageContext={pageContext} onPageContextChange={setPageContext} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
          <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold">{activePage.label} page hero</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {activePage.description} Upload campaign banners or text-only slides. Use{" "}
              <code className="text-xs bg-gray-100 dark:bg-slate-700 px-1 rounded">
                {"{{firstName}}"}
              </code>{" "}
              in the title on the home page. CTA links are tracked via redirect (clicks counted).
              Multiple slides appear as a carousel.
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

      {/* ── Crop Modal ── */}
      {showCropModal && cropSrc ? (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/95">
          <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700 shrink-0">
            <div>
              <p className="text-sm font-semibold text-white">Crop banner</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Drag to reposition · Pinch/scroll to zoom · Output {BANNER_OUTPUT_WIDTH}×
                {BANNER_OUTPUT_HEIGHT}px
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCropModal(false)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cropper area */}
          <div className="relative flex-1 min-h-0">
            <Cropper
              image={cropSrc}
              crop={crop}
              zoom={zoom}
              aspect={BANNER_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              objectFit="contain"
              style={{
                containerStyle: { background: "#0f172a" },
              }}
            />
          </div>

          {/* Zoom + actions */}
          <div className="shrink-0 bg-slate-900 border-t border-slate-700 px-5 py-4 space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 w-10 shrink-0">Zoom</span>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 accent-cyan-500"
              />
              <span className="text-xs text-slate-400 w-10 text-right shrink-0">
                {zoom.toFixed(2)}×
              </span>
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => void handleFitEntireImage()}
                disabled={imageProcessing || cropLoading}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800 disabled:opacity-60"
              >
                Fit entire image
              </button>
              <button
                type="button"
                onClick={() => setShowCropModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void applyCrop()}
                disabled={cropLoading}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white text-sm font-medium"
              >
                <Crop className="w-4 h-4" />
                {cropLoading ? "Processing…" : "Apply crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
              {/* ── Banner image / crop ── */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                  Banner image&nbsp;
                  <span className="text-xs font-normal text-gray-500 dark:text-slate-400">
                    (output {BANNER_OUTPUT_WIDTH}×{BANNER_OUTPUT_HEIGHT}px — fitted by default,
                    crop optional)
                  </span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className="inline-flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 px-4 py-2.5 text-sm text-gray-600 dark:text-slate-400 hover:border-cyan-400 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/30 transition-colors"
                  >
                    <Crop className="w-4 h-4 text-cyan-600" />
                    {croppedFile ? "Change image" : "Choose file"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        e.target.value = "";
                        void handleBannerFileSelect(file);
                      }}
                    />
                  </label>

                  {cropSrc ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setShowCropModal(true);
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                        }}
                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <Crop className="w-4 h-4" />
                        {croppedFile ? "Adjust crop" : "Open crop"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleFitEntireImage()}
                        disabled={imageProcessing}
                        className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 dark:border-cyan-800 bg-cyan-50 dark:bg-cyan-950/40 px-3 py-2 text-sm text-cyan-800 dark:text-cyan-200 hover:bg-cyan-100 dark:hover:bg-cyan-900/50 disabled:opacity-60"
                      >
                        {imageProcessing ? "Processing…" : "Fit entire image"}
                      </button>
                    </>
                  ) : null}
                </div>

                {imageFile && !croppedFile ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Preparing the banner-sized image. You can still adjust the crop if needed.
                  </p>
                ) : null}

                {/* Remove existing image */}
                {editing?.image?.path && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                    <input
                      type="checkbox"
                      checked={removeImage}
                      onChange={(e) => {
                        setRemoveImage(e.target.checked);
                        if (e.target.checked) resetCrop();
                      }}
                    />
                    Remove current image
                  </label>
                )}

                {/* Preview: cropped or existing */}
                {(croppedPreviewUrl || (editing?.image?.path && !removeImage && !croppedPreviewUrl)) && (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={croppedPreviewUrl || EP.assetUrl(editing!.image!.path)}
                      alt=""
                      className="w-full h-[140px] object-contain object-center bg-slate-900"
                    />
                    {croppedPreviewUrl && (
                      <div className="absolute inset-0 flex items-end justify-end p-2 pointer-events-none">
                        <span className="bg-green-600/90 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          {BANNER_OUTPUT_WIDTH}×{BANNER_OUTPUT_HEIGHT} ✓
                        </span>
                      </div>
                    )}
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
