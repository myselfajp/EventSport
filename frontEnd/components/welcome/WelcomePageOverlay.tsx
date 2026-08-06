"use client";

import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  Send,
  Twitter,
  X,
  Youtube,
} from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { getOrCreateVisitorKey } from "@/app/lib/cookie-consent";
import { showAppToast } from "@/app/lib/app-toast";
import {
  markWelcomePageSeen,
  type WelcomePagePublicData,
  type WelcomeSocialPlatform,
} from "@/app/lib/welcome-page";

type LegalDoc = {
  _id: string;
  title: string;
  content: string;
};

type Props = {
  data: WelcomePagePublicData;
  onDismiss: () => void;
};

const SOCIAL_ICONS: Record<WelcomeSocialPlatform, React.ComponentType<{ className?: string }>> = {
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  youtube: Youtube,
  telegram: Send,
  facebook: Facebook,
};

function LegalModal({
  doc,
  onClose,
}: {
  doc: { title: string; content: string };
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{doc.title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div
          className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-gray-700 dark:text-slate-200 prose prose-sm dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: doc.content }}
        />
      </div>
    </div>
  );
}

export default function WelcomePageOverlay({ data, onDismiss }: Props) {
  const [email, setEmail] = useState("");
  const [agreeKvkk, setAgreeKvkk] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [legalModal, setLegalModal] = useState<{ title: string; content: string } | null>(null);
  const [activeKvkk, setActiveKvkk] = useState<LegalDoc | null>(null);
  const [activeCommercial, setActiveCommercial] = useState<LegalDoc | null>(null);
  const [legalLoading, setLegalLoading] = useState(true);

  const imageUrl = data.image?.path ? EP.assetUrl(data.image.path) : null;
  const socialLinks = useMemo(
    () => (data.socialLinks || []).filter((link) => link.url?.trim()),
    [data.socialLinks]
  );

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLegal = async () => {
      setLegalLoading(true);
      try {
        const [kvkkRes, commercialRes] = await Promise.all([
          fetchJSON(EP.LEGAL.getActive("kvkk"), { method: "GET" }, { skipAuth: true }),
          fetchJSON(
            EP.LEGAL.getActive("commercial_messages"),
            { method: "GET" },
            { skipAuth: true }
          ),
        ]);
        if (cancelled) return;
        if (kvkkRes?.success && kvkkRes?.data) setActiveKvkk(kvkkRes.data);
        if (commercialRes?.success && commercialRes?.data) {
          setActiveCommercial(commercialRes.data);
        }
      } finally {
        if (!cancelled) setLegalLoading(false);
      }
    };
    void loadLegal();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    markWelcomePageSeen();
    onDismiss();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!agreeKvkk) {
      setError("Please accept the privacy notice to continue.");
      return;
    }
    if (!activeKvkk?._id) {
      setError("Privacy documents are not available right now. Please try again later.");
      return;
    }
    if (agreeMarketing && !activeCommercial?._id) {
      setError("Marketing consent document is not available.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiFetch(EP.PUBLIC.welcomePageSubscribe, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          visitorKey: getOrCreateVisitorKey(),
          kvkkConsent: true,
          marketingConsent: agreeMarketing,
          kvkkVersionId: activeKvkk._id,
          commercialMessagesVersionId: agreeMarketing ? activeCommercial?._id : null,
        }),
      });
      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message || result?.error || "Could not save your email.");
      }
      showAppToast(result.message || "Welcome to EventSport!", "success");
      handleDismiss();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your email.");
    } finally {
      setSubmitting(false);
    }
  };

  const content = (
    <div className="fixed inset-0 z-[100] bg-black">
      <div className="grid h-full min-h-[100dvh] lg:grid-cols-2">
        <div className="relative flex flex-col justify-between overflow-y-auto bg-white px-6 py-8 sm:px-10 lg:px-14 dark:bg-slate-950">
          <div>
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="text-sm font-semibold tracking-[0.2em] text-cyan-600 uppercase">
                EventSport
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-white"
                aria-label="Close welcome page"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl dark:text-white">
              {data.headline}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-600 sm:text-lg dark:text-slate-300">
              {data.subheadline}
            </p>

            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 max-w-xl">
              <p className="mb-3 text-sm font-medium text-gray-700 dark:text-slate-200">
                {data.emailPrompt}
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full rounded-lg border border-gray-300 bg-white py-3 pr-4 pl-10 text-sm text-gray-900 outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    autoComplete="email"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting || legalLoading || !activeKvkk}
                  className="rounded-lg bg-cyan-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving…" : data.ctaSubmitLabel}
                </button>
              </div>

              <div className="mt-5 space-y-3">
                <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={agreeKvkk}
                    onChange={(e) => setAgreeKvkk(e.target.checked)}
                    disabled={!activeKvkk}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>
                    I have read and accept the{" "}
                    <button
                      type="button"
                      onClick={() =>
                        activeKvkk &&
                        setLegalModal({
                          title: activeKvkk.title,
                          content: activeKvkk.content,
                        })
                      }
                      className="font-medium text-cyan-600 underline hover:text-cyan-700 dark:text-cyan-400"
                    >
                      Privacy Notice (KVKK)
                    </button>
                    .
                  </span>
                </label>

                {activeCommercial && (
                  <label className="flex items-start gap-3 text-sm text-gray-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={agreeMarketing}
                      onChange={(e) => setAgreeMarketing(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                    />
                    <span>
                      I consent to receive emails about events, features and promotions.{" "}
                      <button
                        type="button"
                        onClick={() =>
                          setLegalModal({
                            title: activeCommercial.title,
                            content: activeCommercial.content,
                          })
                        }
                        className="font-medium text-cyan-600 underline hover:text-cyan-700 dark:text-cyan-400"
                      >
                        Commercial messages consent
                      </button>{" "}
                      (optional)
                    </span>
                  </label>
                )}
              </div>

              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-200">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleDismiss}
                className="mt-6 text-sm font-medium text-gray-500 underline-offset-4 hover:text-cyan-600 hover:underline dark:text-slate-400 dark:hover:text-cyan-400"
              >
                {data.ctaSkipLabel}
              </button>
            </form>
          </div>

          {socialLinks.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-3">
              {socialLinks.map((link) => {
                const Icon = SOCIAL_ICONS[link.platform];
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition-colors hover:border-cyan-500 hover:text-cyan-600 dark:border-slate-700 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-400"
                    aria-label={link.platform}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                );
              })}
            </div>
          )}
        </div>

        <div className="relative hidden min-h-[320px] overflow-hidden lg:block">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={data.imageAlt || "EventSport"}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-700 via-slate-900 to-emerald-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          <div className="absolute bottom-10 left-10 right-10">
            <p className="max-w-md text-lg font-medium text-white/90">
              Train together. Compete together. Grow together.
            </p>
          </div>
        </div>
      </div>

      {legalModal && (
        <LegalModal doc={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(content, document.body);
}
