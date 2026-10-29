"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { Save, ExternalLink, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface SocialPlatformConfig {
  id: "linkedin" | "instagram" | "facebook" | "youtube" | "reddit" | "x";
  name: string;
  placeholder: string;
  color: string;
}

const PLATFORMS: SocialPlatformConfig[] = [
  {
    id: "instagram",
    name: "Instagram",
    placeholder: "https://www.instagram.com/yourbrand",
    color: "hover:text-pink-500",
  },
  {
    id: "x",
    name: "X (Twitter)",
    placeholder: "https://x.com/yourhandle",
    color: "hover:text-black dark:hover:text-white",
  },
  {
    id: "facebook",
    name: "Facebook",
    placeholder: "https://www.facebook.com/yourpage",
    color: "hover:text-blue-600",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    placeholder: "https://www.linkedin.com/company/yourcompany",
    color: "hover:text-blue-500",
  },
  {
    id: "youtube",
    name: "YouTube",
    placeholder: "https://www.youtube.com/@yourchannel",
    color: "hover:text-red-500",
  },
  {
    id: "reddit",
    name: "Reddit",
    placeholder: "https://www.reddit.com/r/yourcommunity",
    color: "hover:text-orange-500",
  },
];

export default function SocialLinksManagement() {
  const [links, setLinks] = useState<Record<string, string>>({
    instagram: "",
    x: "",
    facebook: "",
    linkedin: "",
    youtube: "",
    reddit: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    loadLinks();
  }, []);

  const loadLinks = async () => {
    try {
      setLoading(true);
      setErrorMessage("");
      const res = (await fetchJSON(EP.ADMIN.socialLinks.get)) as {
        success: boolean;
        data: Array<{ platform: string; url: string }>;
      };
      if (res && res.data && Array.isArray(res.data)) {
        const next: Record<string, string> = {
          instagram: "",
          x: "",
          facebook: "",
          linkedin: "",
          youtube: "",
          reddit: "",
        };
        for (const item of res.data) {
          if (item.platform && item.platform in next) {
            next[item.platform] = item.url || "";
          }
        }
        setLinks(next);
      }
    } catch (err: any) {
      console.error("Failed to load social links", err);
      setErrorMessage(err?.message || "Failed to load social links.");
    } finally {
      setLoading(false);
    }
  };

  const handleUrlChange = (platform: string, value: string) => {
    setLinks((prev) => ({
      ...prev,
      [platform]: value,
    }));
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setSuccessMessage("");
      setErrorMessage("");

      const payload = PLATFORMS.map((p) => ({
        platform: p.id,
        url: (links[p.id] || "").trim(),
      }));

      await fetchJSON(EP.ADMIN.socialLinks.update, {
        method: "PUT",
        body: { links: payload },
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("eventsport:social-links-updated"));
      }

      setSuccessMessage("Social media links saved successfully. Footer will now update accordingly.");
    } catch (err: any) {
      console.error("Failed to update social links", err);
      setErrorMessage(err?.message || "Failed to save social links.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-cyan-500" />
        <p className="text-sm">Loading social media settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-slate-100">
          Social Media Links
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Configure external social media account links. Links configured here will be displayed as icons in the website footer on the right side. If an input is left blank, its icon will not appear in the footer.
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 flex items-center gap-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        {PLATFORMS.map((platform) => {
          const value = links[platform.id] || "";
          const hasValidUrl = value.trim().length > 0;

          return (
            <div key={platform.id} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={`social-${platform.id}`}
                  className="block text-sm font-medium text-gray-700 dark:text-slate-200"
                >
                  {platform.name}
                </label>
                {hasValidUrl && (
                  <a
                    href={value.startsWith("http") ? value : `https://${value}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                  >
                    <span>Test Link</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="relative">
                <input
                  id={`social-${platform.id}`}
                  type="url"
                  value={value}
                  onChange={(e) => handleUrlChange(platform.id, e.target.value)}
                  placeholder={platform.placeholder}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition"
                />
              </div>
            </div>
          );
        })}

        <div className="pt-4 border-t border-gray-200 dark:border-slate-700 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-medium text-sm transition-all duration-200 shadow-md shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
