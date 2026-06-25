"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Loader2, Mail, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useMe } from "@/app/hooks/useAuth";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { requestAccountDeletion, signOut } from "@/app/lib/auth-api";
import { EP } from "@/app/lib/endpoints";
import {
  CATEGORY_LABELS_TR,
  DEFAULT_TITLES_TR,
  type ContractCategory,
  type LegalDocType,
} from "@/app/lib/contract-documents";
import LegalContentModal from "@/components/auth/LegalContentModal";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type CommercialDoc = {
  _id: string;
  title: string;
  content: string;
};

type CatalogDoc = {
  docType: LegalDocType;
  category: ContractCategory;
  title: string;
};

type CatalogData = {
  legal: CatalogDoc[];
  gamer: CatalogDoc[];
  coach: CatalogDoc[];
};

const CATEGORY_ORDER: ContractCategory[] = ["legal", "gamer", "coach"];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const { data: user } = useMe();
  const queryClient = useQueryClient();
  const hasCoachProfile = !!user?.coach;
  const isAdmin = user?.role === 0;

  const [promotionalEmails, setPromotionalEmails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDeleteSection, setShowDeleteSection] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [activeCommercialMessages, setActiveCommercialMessages] =
    useState<CommercialDoc | null>(null);
  const [loadingCommercial, setLoadingCommercial] = useState(false);
  const [legalModal, setLegalModal] = useState<CommercialDoc | null>(null);
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setPromotionalEmails(Boolean(user?.marketingConsent?.agreed));
    setError("");
    setShowDeleteSection(false);
    setDeleteConfirmation("");
    setDeleteError("");
  }, [isOpen, user?.marketingConsent?.agreed]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadCommercial = async () => {
      setLoadingCommercial(true);
      try {
        const res = await fetch(
          EP.LEGAL.getActive("commercial_messages"),
          { credentials: "include" }
        );
        const body = await res.json().catch(() => ({}));
        if (!cancelled && body?.success && body?.data) {
          setActiveCommercialMessages(body.data as CommercialDoc);
        } else if (!cancelled) {
          setActiveCommercialMessages(null);
        }
      } catch {
        if (!cancelled) setActiveCommercialMessages(null);
      } finally {
        if (!cancelled) setLoadingCommercial(false);
      }
    };
    void loadCommercial();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const loadCatalog = async () => {
      setLoadingCatalog(true);
      try {
        const res = await fetchJSON(
          EP.PUBLIC.contractsCatalog,
          { method: "GET" },
          { skipAuth: true }
        );
        if (!cancelled && res?.success && res?.data) {
          setCatalog(res.data as CatalogData);
        } else if (!cancelled) {
          setCatalog(null);
        }
      } catch {
        if (!cancelled) setCatalog(null);
      } finally {
        if (!cancelled) setLoadingCatalog(false);
      }
    };
    void loadCatalog();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const catalogSections = useMemo(() => {
    if (!catalog) return [];
    const categories = hasCoachProfile
      ? CATEGORY_ORDER
      : CATEGORY_ORDER.filter((c) => c !== "coach");
    return categories
      .map((category) => ({
        category,
        label: CATEGORY_LABELS_TR[category],
        docs: catalog[category] ?? [],
      }))
      .filter((section) => section.docs.length > 0);
  }, [catalog, hasCoachProfile]);

  const persistMarketingConsent = async (nextValue: boolean) => {
    if (!user) return;
    if (nextValue && !activeCommercialMessages?._id) {
      setError(
        "Commercial messages consent is not available until an active text is published in Admin → Legal."
      );
      return;
    }

    const previous = promotionalEmails;
    setPromotionalEmails(nextValue);
    setSaving(true);
    setError("");

    try {
      const payload: Record<string, unknown> = {
        marketingConsent: nextValue,
      };
      if (nextValue && activeCommercialMessages?._id) {
        payload.commercialMessagesVersionId = activeCommercialMessages._id;
      }

      const res = await apiFetch(EP.AUTH.accountSettings, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        throw new Error(
          body?.message || body?.error || "Failed to update settings"
        );
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
    } catch (err) {
      setPromotionalEmails(previous);
      setError(
        err instanceof Error ? err.message : "Failed to update settings"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "delete") return;

    setDeletingAccount(true);
    setDeleteError("");

    try {
      await requestAccountDeletion("delete");
      await signOut();
      queryClient.removeQueries({ queryKey: ["auth", "me"], exact: true });
      onClose();
      router.push("/");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Account deletion failed."
      );
    } finally {
      setDeletingAccount(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          ) : null}

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Legal &amp; contracts
            </p>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40 overflow-hidden">
              <Link
                href="/sozlesmeler"
                onClick={onClose}
                className="flex items-center gap-3 p-4 hover:bg-gray-100/80 dark:hover:bg-gray-800/60 transition-colors border-b border-gray-200 dark:border-gray-700"
              >
                <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30 shrink-0">
                  <FileText className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    View all agreements
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    KVKK, terms, event contracts, and other published texts
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>

              {loadingCatalog ? (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-500" />
                  Loading agreements…
                </div>
              ) : catalogSections.length === 0 ? (
                <p className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                  No published agreements yet.
                </p>
              ) : (
                <div className="px-2 py-2 space-y-3">
                  {catalogSections.map((section) => (
                    <div key={section.category}>
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {section.label}
                      </p>
                      <ul className="space-y-0.5">
                        {section.docs.map((doc) => (
                          <li key={doc.docType}>
                            <Link
                              href={`/legal/${doc.docType}`}
                              onClick={onClose}
                              className="flex items-center justify-between gap-2 px-2 py-2 rounded-lg text-sm text-gray-700 dark:text-slate-300 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                            >
                              <span className="truncate">
                                {doc.title ||
                                  DEFAULT_TITLES_TR[doc.docType] ||
                                  doc.docType}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Communications
            </p>

            <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-900/40">
              <div className="p-2 rounded-lg bg-cyan-50 dark:bg-cyan-900/30 shrink-0">
                <Mail className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Promotional emails
                  </p>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={promotionalEmails}
                    disabled={
                      saving ||
                      loadingCommercial ||
                      (!promotionalEmails && !activeCommercialMessages)
                    }
                    onClick={() => void persistMarketingConsent(!promotionalEmails)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                      promotionalEmails
                        ? "bg-cyan-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        promotionalEmails ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                    {saving ? (
                      <Loader2 className="absolute -right-7 w-4 h-4 animate-spin text-cyan-500" />
                    ) : null}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                  Receive event updates, offers, and announcements by email.
                </p>
                {activeCommercialMessages ? (
                  <button
                    type="button"
                    onClick={() => setLegalModal(activeCommercialMessages)}
                    className="text-xs text-cyan-600 dark:text-cyan-400 underline mt-2"
                  >
                    View commercial messages policy
                  </button>
                ) : loadingCommercial ? (
                  <p className="text-xs text-gray-400 mt-2">Loading policy…</p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    Opt-in unavailable until a commercial messages text is published.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-3">
              Account
            </p>

            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 overflow-hidden">
              {!showDeleteSection ? (
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    Delete my account
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                    Your account will be deactivated immediately. Personal data
                    will be anonymized after the legal retention period (24
                    months).
                  </p>
                  {isAdmin ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                      Admin accounts cannot be deleted this way.
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowDeleteSection(true)}
                      className="mt-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 border border-red-300 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete my account
                    </button>
                  )}
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    This action cannot be undone. Type{" "}
                    <span className="font-mono font-semibold">delete</span> below
                    to confirm.
                  </p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => setDeleteConfirmation(e.target.value)}
                    placeholder="delete"
                    autoComplete="off"
                    disabled={deletingAccount}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-red-200 dark:border-red-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  />
                  {deleteError ? (
                    <p className="text-xs text-red-600 dark:text-red-400">
                      {deleteError}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowDeleteSection(false);
                        setDeleteConfirmation("");
                        setDeleteError("");
                      }}
                      disabled={deletingAccount}
                      className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDeleteAccount()}
                      disabled={
                        deletingAccount || deleteConfirmation !== "delete"
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingAccount ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Deleting…
                        </>
                      ) : (
                        "Permanently deactivate account"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {legalModal ? (
        <LegalContentModal
          title={legalModal.title}
          content={legalModal.content}
          onClose={() => setLegalModal(null)}
        />
      ) : null}
    </div>
  );
};

export default SettingsModal;
