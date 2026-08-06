"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  WELCOME_SOCIAL_LABELS,
  WELCOME_SOCIAL_PLATFORMS,
  type WelcomeSocialPlatform,
} from "@/app/lib/welcome-page";
import { ImageIcon, Mail, Save, Upload } from "lucide-react";

type WelcomeSettings = {
  headline?: string;
  subheadline?: string;
  emailPrompt?: string;
  ctaSubmitLabel?: string;
  ctaSkipLabel?: string;
  imageAlt?: string;
  isActive?: boolean;
  image?: { path?: string };
  socialLinks?: Array<{ platform: WelcomeSocialPlatform; url: string }>;
};

type WelcomeLead = {
  _id: string;
  email: string;
  kvkkConsent: boolean;
  marketingConsent: boolean;
  visitorKey?: string;
  user?: { firstName?: string; lastName?: string; email?: string };
  createdAt: string;
};

export default function WelcomePageManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"settings" | "leads">("settings");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [emailPrompt, setEmailPrompt] = useState("");
  const [ctaSubmitLabel, setCtaSubmitLabel] = useState("");
  const [ctaSkipLabel, setCtaSkipLabel] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [socialLinks, setSocialLinks] = useState<
    Record<WelcomeSocialPlatform, string>
  >({
    instagram: "",
    twitter: "",
    linkedin: "",
    youtube: "",
    telegram: "",
    facebook: "",
  });

  const [leads, setLeads] = useState<WelcomeLead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsPage, setLeadsPage] = useState(1);
  const [leadsTotalPages, setLeadsTotalPages] = useState(1);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.welcomePage.get, { method: "GET" });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Failed to load welcome page");
      }
      const data = res.data as WelcomeSettings;
      setHeadline(data.headline || "");
      setSubheadline(data.subheadline || "");
      setEmailPrompt(data.emailPrompt || "");
      setCtaSubmitLabel(data.ctaSubmitLabel || "");
      setCtaSkipLabel(data.ctaSkipLabel || "");
      setImageAlt(data.imageAlt || "");
      setIsActive(data.isActive !== false);
      setExistingImageUrl(data.image?.path ? EP.assetUrl(data.image.path) : null);

      const nextLinks = { ...socialLinks };
      for (const platform of WELCOME_SOCIAL_PLATFORMS) nextLinks[platform] = "";
      for (const link of data.socialLinks || []) {
        if (link?.platform) nextLinks[link.platform] = link.url || "";
      }
      setSocialLinks(nextLinks);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load welcome page");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async (page = 1) => {
    try {
      setLeadsLoading(true);
      const res = await fetchJSON(EP.ADMIN.welcomePage.leads({ page, limit: 25 }), {
        method: "GET",
      });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Failed to load signups");
      }
      setLeads(res.data || []);
      setLeadsPage(res.page || page);
      setLeadsTotalPages(res.totalPages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load signups");
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  useEffect(() => {
    if (tab === "leads") void loadLeads(leadsPage);
  }, [tab, leadsPage]);

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError("");
      setMessage("");

      const formData = new FormData();
      formData.append(
        "data",
        JSON.stringify({
          headline,
          subheadline,
          emailPrompt,
          ctaSubmitLabel,
          ctaSkipLabel,
          imageAlt,
          isActive,
          socialLinks: WELCOME_SOCIAL_PLATFORMS.map((platform) => ({
            platform,
            url: socialLinks[platform]?.trim() || "",
          })).filter((link) => link.url),
        })
      );
      if (imageFile) formData.append("welcome-page-image", imageFile);

      const response = await apiFetch(EP.ADMIN.welcomePage.update, {
        method: "PUT",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Save failed");
      }

      setMessage("Welcome page saved.");
      setImageFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const imagePreview = previewUrl || existingImageUrl;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("settings")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "settings"
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          Page settings
        </button>
        <button
          type="button"
          onClick={() => setTab("leads")}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === "leads"
              ? "bg-cyan-600 text-white"
              : "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          Email signups
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      {message && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          {message}
        </div>
      )}

      {tab === "settings" && (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : (
            <>
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-cyan-600"
                />
                Show welcome page on first visit
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Headline</label>
                  <input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Email prompt</label>
                  <input
                    value={emailPrompt}
                    onChange={(e) => setEmailPrompt(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">Subheadline</label>
                <textarea
                  value={subheadline}
                  onChange={(e) => setSubheadline(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium">Submit button label</label>
                  <input
                    value={ctaSubmitLabel}
                    onChange={(e) => setCtaSubmitLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium">Skip button label</label>
                  <input
                    value={ctaSkipLabel}
                    onChange={(e) => setCtaSkipLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                  <ImageIcon className="h-4 w-4" />
                  Hero image (right panel)
                </div>
                <div className="grid gap-4 md:grid-cols-[240px_1fr]">
                  <div className="aspect-[4/5] overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 dark:border-slate-600 dark:bg-slate-900">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Welcome preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-slate-600"
                    >
                      <Upload className="h-4 w-4" />
                      Upload image
                    </button>
                    <div>
                      <label className="mb-2 block text-sm font-medium">Image alt text</label>
                      <input
                        value={imageAlt}
                        onChange={(e) => setImageAlt(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 dark:border-slate-700">
                <div className="mb-4 text-sm font-semibold">Social media links</div>
                <div className="grid gap-3 md:grid-cols-2">
                  {WELCOME_SOCIAL_PLATFORMS.map((platform) => (
                    <div key={platform}>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500">
                        {WELCOME_SOCIAL_LABELS[platform]}
                      </label>
                      <input
                        value={socialLinks[platform]}
                        onChange={(e) =>
                          setSocialLinks((prev) => ({
                            ...prev,
                            [platform]: e.target.value,
                          }))
                        }
                        placeholder="https://"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save welcome page"}
              </button>
            </>
          )}
        </form>
      )}

      {tab === "leads" && (
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3 text-sm font-semibold dark:border-slate-700">
            <Mail className="h-4 w-4" />
            Collected emails & consent flags
          </div>
          {leadsLoading ? (
            <p className="p-4 text-sm text-gray-500">Loading signups…</p>
          ) : leads.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No signups yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">KVKK</th>
                    <th className="px-4 py-3">Marketing</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead._id} className="border-t border-gray-100 dark:border-slate-800">
                      <td className="px-4 py-3">{lead.email}</td>
                      <td className="px-4 py-3">{lead.kvkkConsent ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">{lead.marketingConsent ? "Yes" : "No"}</td>
                      <td className="px-4 py-3">
                        {lead.user
                          ? `${lead.user.firstName || ""} ${lead.user.lastName || ""}`.trim() ||
                            lead.user.email ||
                            "—"
                          : "Guest"}
                      </td>
                      <td className="px-4 py-3">
                        {new Date(lead.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {leadsTotalPages > 1 && (
            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-slate-700">
              <button
                type="button"
                disabled={leadsPage <= 1}
                onClick={() => setLeadsPage((p) => Math.max(1, p - 1))}
                className="rounded border px-3 py-1 text-sm disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {leadsPage} / {leadsTotalPages}
              </span>
              <button
                type="button"
                disabled={leadsPage >= leadsTotalPages}
                onClick={() => setLeadsPage((p) => p + 1)}
                className="rounded border px-3 py-1 text-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
