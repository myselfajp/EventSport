"use client";

import React, { useEffect, useState } from "react";
import { X, Upload } from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";

const PERFORMANCE_BRANCHES = [
  { value: "manager", label: "Manager" },
  { value: "psychologist", label: "Psychologist" },
  { value: "dietitian", label: "Dietitian" },
  { value: "psychotherapist", label: "Psychotherapist" },
] as const;

type PerformanceProfile = {
  _id: string;
  branch: string;
  title?: string;
  about?: string;
  status?: "Pending" | "Approved" | "Rejected";
  certificate?: { originalName?: string };
  rejectionReason?: string;
};

type PerformanceApplyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function PerformanceApplyModal({
  isOpen,
  onClose,
  onSaved,
}: PerformanceApplyModalProps) {
  const { data: user } = useMe();
  const [profile, setProfile] = useState<PerformanceProfile | null>(null);
  const [branch, setBranch] = useState("dietitian");
  const [title, setTitle] = useState("");
  const [about, setAbout] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJSON(EP.PERFORMANCE.currentProfile, {
          method: "GET",
        });
        if (cancelled) return;
        const data = (res?.data || null) as PerformanceProfile | null;
        setProfile(data);
        if (data) {
          setBranch(data.branch || "dietitian");
          setTitle(data.title || "");
          setAbout(data.about || "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Profile could not be loaded.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const handleClose = () => {
    setError("");
    setCertificate(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (user?.coach) {
      setError(
        "Coaches cannot apply to the Performance Team. These roles are mutually exclusive."
      );
      return;
    }

    if (!profile && !certificate) {
      setError("Please upload your certificate or license.");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("data", JSON.stringify({ branch, title, about }));
      if (certificate) {
        fd.append("performance-certificate", certificate);
      }

      const response = await apiFetch(EP.PERFORMANCE.apply, {
        method: "POST",
        body: fd,
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok || json?.success === false) {
        throw new Error(json?.message || "Performance Team application could not be saved.");
      }

      onSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Application could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-gray-800 shadow-xl border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Performance Team Application
            </h2>
            {profile?.status && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Current status: {profile.status}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
          ) : (
            <>
              {profile?.status === "Rejected" && profile.rejectionReason && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
                  {profile.rejectionReason}
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  {PERFORMANCE_BRANCHES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title / Specialty
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Sports dietitian, clinical psychologist..."
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  About
                </label>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Certificate / License
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 hover:border-cyan-500 dark:border-gray-600 dark:text-gray-300">
                  <Upload className="h-5 w-5 text-cyan-600" />
                  <span className="flex-1">
                    {certificate?.name ||
                      profile?.certificate?.originalName ||
                      "Upload certificate or license"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf,.pdf"
                    className="hidden"
                    onChange={(e) => setCertificate(e.target.files?.[0] || null)}
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Send for approval"}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
