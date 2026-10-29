"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Upload } from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";
import ProviderRoleSwitchConsent from "./ProviderRoleSwitchConsent";
import LegalContentModal from "@/components/auth/LegalContentModal";

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
  const [roleSwitchAccepted, setRoleSwitchAccepted] = useState(false);
  const [agreeProviderAgreement, setAgreeProviderAgreement] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [activeCommercialMessages, setActiveCommercialMessages] = useState<{
    _id: string;
    title: string;
    content: string;
  } | null>(null);
  const [commercialLegalModal, setCommercialLegalModal] = useState<{
    title: string;
    content: string;
  } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);
        setError("");
        const [res, commercialRes] = await Promise.all([
          fetchJSON(EP.PERFORMANCE.currentProfile, { method: "GET" }),
          fetchJSON(
            EP.LEGAL.getActive("commercial_messages"),
            { method: "GET" },
            { skipAuth: true }
          ).catch(() => null),
        ]);

        if (cancelled) return;
        const data = (res?.data || null) as PerformanceProfile | null;
        setProfile(data);
        if (data) {
          setBranch(data.branch || "dietitian");
          setTitle(data.title || "");
          setAbout(data.about || "");
        }
        if (commercialRes?.success && commercialRes?.data) {
          setActiveCommercialMessages(commercialRes.data);
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
    setRoleSwitchAccepted(false);
    setAgreeProviderAgreement(false);
    setMarketingConsent(false);
    setCommercialLegalModal(null);
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (user?.coach && !roleSwitchAccepted) {
      setError("Please confirm that you understand your coach data will be deleted.");
      return;
    }

    if (!profile && !agreeProviderAgreement) {
      setError("You must read and accept the Provider Agreement.");
      return;
    }

    if (!profile && !certificate) {
      setError("Please upload your certificate or license.");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      fd.append(
        "data",
        JSON.stringify({
          branch,
          title,
          about,
          agreeProviderAgreement,
          marketingConsent,
          ...(marketingConsent && activeCommercialMessages?._id
            ? { commercialMessagesVersionId: activeCommercialMessages._id }
            : {}),
          ...(user?.coach ? { confirmRoleSwitch: true } : {}),
        })
      );
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
    <div className="fixed inset-0 z-app-modal flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[min(90vh,100dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
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

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
            {loading ? (
              <div className="py-8 text-center text-sm text-gray-500">Loading...</div>
            ) : (
              <>
                {user?.coach && (
                  <ProviderRoleSwitchConsent
                    direction="to-performance"
                    checked={roleSwitchAccepted}
                    onChange={setRoleSwitchAccepted}
                  />
                )}

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

                {!profile && (
                  <div className="space-y-4 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 p-4">
                    <h3 className="text-base font-medium text-gray-800 dark:text-white">
                      Approvals
                    </h3>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={agreeProviderAgreement}
                        onChange={(e) => setAgreeProviderAgreement(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        disabled={saving}
                      />
                      <span>
                        I have read and agree to the{" "}
                        <Link
                          href="/contracts#coach-agreement"
                          className="text-cyan-600 dark:text-cyan-400 underline font-medium"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Provider Agreement
                        </Link>
                        .
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-700 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={(e) => setMarketingConsent(e.target.checked)}
                        className="mt-1 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                        disabled={saving || !activeCommercialMessages}
                      />
                      <span>
                        {activeCommercialMessages ? (
                          <>
                            I consent to receiving commercial electronic messages. I have read the{" "}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                setCommercialLegalModal({
                                  title: activeCommercialMessages.title,
                                  content: activeCommercialMessages.content,
                                });
                              }}
                              className="text-cyan-600 dark:text-cyan-400 underline font-medium"
                            >
                              Commercial Electronic Messages Consent (IYS)
                            </button>
                            .
                          </>
                        ) : (
                          <>Commercial messages opt-in is unavailable until an active consent text is published in Admin → Legal.</>
                        )}
                      </span>
                    </label>
                  </div>
                )}

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-200">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>

          {!loading && (
            <div className="flex shrink-0 justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (user?.coach ? !roleSwitchAccepted : false)}
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Send for approval"}
              </button>
            </div>
          )}
        </form>
      </div>

      {commercialLegalModal && (
        <LegalContentModal
          title={commercialLegalModal.title}
          content={commercialLegalModal.content}
          onClose={() => setCommercialLegalModal(null)}
        />
      )}
    </div>
  );
}
