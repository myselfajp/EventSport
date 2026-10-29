"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJSON, apiFetch } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { ImageIcon, Save, Trash2, Upload, Sun, Moon } from "lucide-react";

const LOGO_RECOMMENDED_WIDTH = 300;
const LOGO_RECOMMENDED_HEIGHT = 64;
const LOGO_MAX_FILE_SIZE_MB = 10;
const LOGO_MAX_FILE_SIZE_BYTES = LOGO_MAX_FILE_SIZE_MB * 1024 * 1024;

interface HeaderLogo {
  _id?: string;
  imageAlt?: string;
  isActive?: boolean;
  image?: { path: string; mimeType?: string };
  imageDark?: { path: string; mimeType?: string };
  updatedAt?: string;
}

export default function DashboardHeaderLogoManagement() {
  const lightFileInputRef = useRef<HTMLInputElement>(null);
  const darkFileInputRef = useRef<HTMLInputElement>(null);

  const [logo, setLogo] = useState<HeaderLogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [imageAlt, setImageAlt] = useState("EventSport");
  const [isActive, setIsActive] = useState(true);

  // Light logo state
  const [lightFile, setLightFile] = useState<File | null>(null);
  const [previewLightBlobUrl, setPreviewLightBlobUrl] = useState<string | null>(null);
  const [removeLightRequested, setRemoveLightRequested] = useState(false);

  // Dark logo state
  const [darkFile, setDarkFile] = useState<File | null>(null);
  const [previewDarkBlobUrl, setPreviewDarkBlobUrl] = useState<string | null>(null);
  const [removeDarkRequested, setRemoveDarkRequested] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeaderLogo.get, {
        method: "GET",
      });
      if (res?.success) {
        const data = res.data as HeaderLogo | null;
        setLogo(data);
        setImageAlt(data?.imageAlt || "EventSport");
        setIsActive(data?.isActive !== false);

        setLightFile(null);
        setDarkFile(null);
        setRemoveLightRequested(false);
        setRemoveDarkRequested(false);

        if (lightFileInputRef.current) lightFileInputRef.current.value = "";
        if (darkFileInputRef.current) darkFileInputRef.current.value = "";
      } else {
        setError(res?.message || res?.error || "Failed to load logo");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load logo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!lightFile) {
      setPreviewLightBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(lightFile);
    setPreviewLightBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [lightFile]);

  useEffect(() => {
    if (!darkFile) {
      setPreviewDarkBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(darkFile);
    setPreviewDarkBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [darkFile]);

  const existingLightUrl = !removeLightRequested && logo?.image?.path ? EP.assetUrl(logo.image.path) : null;
  const lightPreviewUrl = previewLightBlobUrl || existingLightUrl;

  const existingDarkUrl = !removeDarkRequested && logo?.imageDark?.path ? EP.assetUrl(logo.imageDark.path) : null;
  const darkPreviewUrl = previewDarkBlobUrl || existingDarkUrl;

  const handleLightFileSelect = (file?: File) => {
    setError("");
    if (!file) {
      setLightFile(null);
      return;
    }
    if (file.size > LOGO_MAX_FILE_SIZE_BYTES) {
      setLightFile(null);
      if (lightFileInputRef.current) lightFileInputRef.current.value = "";
      setError(`Light logo image must be ${LOGO_MAX_FILE_SIZE_MB} MB or smaller.`);
      return;
    }
    setRemoveLightRequested(false);
    setLightFile(file);
  };

  const handleDarkFileSelect = (file?: File) => {
    setError("");
    if (!file) {
      setDarkFile(null);
      return;
    }
    if (file.size > LOGO_MAX_FILE_SIZE_BYTES) {
      setDarkFile(null);
      if (darkFileInputRef.current) darkFileInputRef.current.value = "";
      setError(`Dark logo image must be ${LOGO_MAX_FILE_SIZE_MB} MB or smaller.`);
      return;
    }
    setRemoveDarkRequested(false);
    setDarkFile(file);
  };

  const handleDeleteAll = async () => {
    if (!logo?.image?.path && !logo?.imageDark?.path) return;
    if (!confirm("Remove all header logos from the site?")) return;

    try {
      setDeleting(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeaderLogo.delete, {
        method: "DELETE",
      });
      if (res?.success) {
        setLogo(null);
        setLightFile(null);
        setDarkFile(null);
        setRemoveLightRequested(false);
        setRemoveDarkRequested(false);
        if (lightFileInputRef.current) lightFileInputRef.current.value = "";
        if (darkFileInputRef.current) darkFileInputRef.current.value = "";
      } else {
        setError(res?.message || res?.error || "Failed to remove logo");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove logo");
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");

      const willHaveLight = (!!existingLightUrl || !!lightFile) && !removeLightRequested;
      const willHaveDark = (!!existingDarkUrl || !!darkFile) && !removeDarkRequested;

      if (!willHaveLight && !willHaveDark) {
        setError("Please upload at least one logo image (Light or Dark).");
        return;
      }

      const payload: Record<string, unknown> = {
        imageAlt,
        isActive,
        removeImage: removeLightRequested,
        removeImageDark: removeDarkRequested,
      };

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (lightFile) {
        fd.append("header-logo-image", lightFile);
      }
      if (darkFile) {
        fd.append("header-logo-image-dark", darkFile);
      }

      const res = await apiFetch(EP.ADMIN.dashboardHeaderLogo.update, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        await load();
      } else {
        setError(data?.message || data?.error || "Save failed");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
        <ImageIcon className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        <div>
          <h2 className="text-lg font-semibold">Site Header Logos</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Upload custom logos for both Light and Dark themes. Recommended size:{" "}
            {LOGO_RECOMMENDED_WIDTH}x{LOGO_RECOMMENDED_HEIGHT}px. Max file size:{" "}
            {LOGO_MAX_FILE_SIZE_MB} MB.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">Loading...</p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl space-y-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6 dark:border-slate-700 dark:bg-slate-800/50"
        >
          <div className="rounded-lg border border-cyan-200 bg-cyan-50/70 px-3 py-2 text-xs text-cyan-950 dark:border-cyan-900/60 dark:bg-cyan-950/30 dark:text-cyan-100">
            Recommended canvas: {LOGO_RECOMMENDED_WIDTH}x{LOGO_RECOMMENDED_HEIGHT}px. Accepted
            formats: PNG, JPG, WebP, SVG. Transparent background recommended.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Light Mode Logo */}
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-500" />
                <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Light Theme Logo
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Shown when the site is viewed in light mode or as the default fallback.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => lightFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 dark:hover:bg-cyan-900/50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose file
                </button>
                <input
                  ref={lightFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleLightFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
                <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
                  {lightFile?.name || (existingLightUrl ? "Current logo in use" : "No file selected")}
                </span>
              </div>

              {lightPreviewUrl ? (
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Light Preview
                  </span>
                  <div className="overflow-visible rounded-lg border border-gray-200 bg-white p-4 shadow-inner flex items-center justify-center min-h-[80px]">
                    <img
                      src={lightPreviewUrl}
                      alt={imageAlt || "Light logo preview"}
                      className="block h-12 w-auto max-h-12 max-w-[240px] object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setLightFile(null);
                      setRemoveLightRequested(true);
                      if (lightFileInputRef.current) lightFileInputRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove light logo
                  </button>
                </div>
              ) : null}
            </div>

            {/* Dark Mode Logo */}
            <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-slate-700 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-cyan-400" />
                <label className="text-sm font-semibold text-gray-800 dark:text-slate-200">
                  Dark Theme Logo
                </label>
              </div>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                Shown when the site is viewed in dark mode. White or light artwork recommended.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => darkFileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-medium text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 dark:hover:bg-cyan-900/50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Choose file
                </button>
                <input
                  ref={darkFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(e) => handleDarkFileSelect(e.target.files?.[0])}
                  className="hidden"
                />
                <span className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[160px]">
                  {darkFile?.name || (existingDarkUrl ? "Current dark logo in use" : "No file selected")}
                </span>
              </div>

              {darkPreviewUrl ? (
                <div className="mt-3 space-y-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-gray-500 dark:text-slate-400">
                    Dark Preview
                  </span>
                  <div className="overflow-visible rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-inner flex items-center justify-center min-h-[80px]">
                    <img
                      src={darkPreviewUrl}
                      alt={imageAlt || "Dark logo preview"}
                      className="block h-12 w-auto max-h-12 max-w-[240px] object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDarkFile(null);
                      setRemoveDarkRequested(true);
                      if (darkFileInputRef.current) darkFileInputRef.current.value = "";
                    }}
                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove dark logo
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Alt Text
            </label>
            <input
              type="text"
              value={imageAlt}
              onChange={(e) => setImageAlt(e.target.value)}
              maxLength={120}
              placeholder="EventSport"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
            />
            Show logo on site header
          </label>

          {logo?.updatedAt ? (
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Last updated:{" "}
              {new Date(logo.updatedAt).toLocaleString("en-US", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-700/60">
            {(logo?.image?.path || logo?.imageDark?.path) ? (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 disabled:opacity-60 dark:text-red-400"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? "Removing..." : "Remove all logos"}
              </button>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save Logos"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
