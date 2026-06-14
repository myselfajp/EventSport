"use client";

import { useEffect, useRef, useState } from "react";
import { fetchJSON, apiFetch } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { ImageIcon, Save, Trash2, Upload } from "lucide-react";

interface HeaderLogo {
  _id?: string;
  imageAlt?: string;
  isActive?: boolean;
  image?: { path: string; mimeType?: string };
  updatedAt?: string;
}

export default function DashboardHeaderLogoManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logo, setLogo] = useState<HeaderLogo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [imageAlt, setImageAlt] = useState("EventSport");
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

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
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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
    if (!imageFile) {
      setPreviewBlobUrl(null);
      return;
    }
    const u = URL.createObjectURL(imageFile);
    setPreviewBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [imageFile]);

  const existingImageUrl = logo?.image?.path ? EP.assetUrl(logo.image.path) : null;
  const previewUrl = previewBlobUrl || existingImageUrl;

  const handleDelete = async () => {
    if (!logo?.image?.path) return;
    if (!confirm("Remove the header logo from the site?")) return;

    try {
      setDeleting(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.dashboardHeaderLogo.delete, {
        method: "DELETE",
      });
      if (res?.success) {
        setLogo(null);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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

      const hasExistingImage = !!logo?.image?.path;
      if (!imageFile && !hasExistingImage) {
        setError("Please upload a logo image.");
        return;
      }

      const payload: Record<string, unknown> = {
        imageAlt,
        isActive,
      };

      const fd = new FormData();
      fd.append("data", JSON.stringify(payload));
      if (imageFile) {
        fd.append("header-logo-image", imageFile);
      }

      const res = await apiFetch(EP.ADMIN.dashboardHeaderLogo.update, {
        method: "PUT",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data?.success) {
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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
          <h2 className="text-lg font-semibold">Site header logo</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Upload a transparent PNG or SVG for the center of the site header. On page load the logo
            animates from 75% to 110%, then settles at 100%.
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
          className="max-w-xl space-y-5 rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800/50"
        >
          <div className="space-y-3">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Logo image
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-medium text-cyan-800 hover:bg-cyan-100 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-200 dark:hover:bg-cyan-900/50"
              >
                <Upload className="w-4 h-4" />
                Choose file
              </button>
              <span className="text-sm text-gray-500 dark:text-slate-400">
                {imageFile?.name || (existingImageUrl ? "Current logo in use" : "No file selected")}
              </span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setImageFile(file ?? null);
                }}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-slate-400">
              Required: transparent background (PNG or SVG). Do not upload JPEG photos or images with
              a solid or textured backdrop — only the mark and wordmark should be visible.
            </p>

            {previewUrl ? (
              <div className="mt-2 space-y-3">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Header preview
                </p>
                <div className="overflow-visible rounded-lg border border-gray-200 bg-white dark:border-slate-600 dark:bg-slate-900">
                  <div className="h-14 border-b border-gray-200 dark:border-slate-700" />
                  <div className="flex justify-center -mt-14">
                    <div className="rounded-b-2xl border border-t-0 border-gray-200/90 bg-white px-5 pb-4 pt-1.5 shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)] dark:border-slate-700/90 dark:bg-slate-900">
                      <img
                        src={previewUrl}
                        alt={imageAlt || "Logo preview"}
                        className="block h-14 w-auto max-h-14 max-w-[300px] object-contain sm:h-16 sm:max-h-16"
                      />
                    </div>
                  </div>
                  <div className="h-6 bg-slate-100 dark:bg-slate-800" aria-hidden="true" />
                </div>
                {existingImageUrl && !imageFile ? (
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 text-sm text-red-600 hover:text-red-700 disabled:opacity-60 dark:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                    {deleting ? "Removing..." : "Remove logo from site"}
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
              Alt text
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

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              {saving ? "Saving..." : "Save logo"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
