"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SitePageShell from "@/components/SitePageShell";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { DOC_TYPE_LABELS, isLegalDocType } from "@/app/lib/contract-documents";

export default function LegalPublicPage() {
  const params = useParams();
  const raw = typeof params?.docType === "string" ? params.docType : "";
  const docType = isLegalDocType(raw) ? raw : null;

  const [doc, setDoc] = useState<{ title: string; content: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!docType) {
      setLoading(false);
      setError("Invalid URL.");
      setDoc(null);
      return;
    }

    let cancelled = false;

    async function load() {
      if (!docType) return;

      setLoading(true);
      setError("");
      try {
        const res = await fetchJSON(EP.LEGAL.getActive(docType), {
          method: "GET",
        }, { skipAuth: true });
        if (cancelled) return;
        if (res?.success && res?.data) {
          setDoc({
            title: String(res.data.title ?? DOC_TYPE_LABELS[docType]),
            content: String(res.data.content ?? ""),
          });
        } else {
          setError(
            res?.error ||
              res?.message ||
              "Document not found or not published."
          );
          setDoc(null);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load document.");
          setDoc(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [docType]);

  return (
    <SitePageShell>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Loading…
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-6 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      ) : doc ? (
        <article>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {doc.title}
          </h1>
          <div
            className="static-page-content bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-6 sm:p-8"
            dangerouslySetInnerHTML={{ __html: doc.content }}
          />
        </article>
      ) : null}
    </SitePageShell>
  );
}
