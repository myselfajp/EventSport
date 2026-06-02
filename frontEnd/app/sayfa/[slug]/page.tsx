"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import SitePageShell from "@/components/SitePageShell";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { LEGACY_STATIC_CONTRACT_REDIRECTS } from "@/app/lib/contract-documents";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export default function PublicStaticPage() {
  const router = useRouter();
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const [page, setPage] = useState<{ title: string; content: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug || !SLUG_RE.test(slug)) {
      setLoading(false);
      setError("Geçersiz sayfa adresi.");
      setPage(null);
      return;
    }

    const clientRedirect = LEGACY_STATIC_CONTRACT_REDIRECTS[slug];
    if (clientRedirect) {
      router.replace(clientRedirect);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetchJSON(EP.PUBLIC.staticPageByName(slug), {
          method: "GET",
        });
        if (cancelled) return;
        if (res?.success && typeof res.redirect === "string") {
          router.replace(res.redirect);
          return;
        }
        if (res?.success && res?.data?.content != null) {
          setPage({
            title: String(res.data.title ?? ""),
            content: String(res.data.content),
          });
        } else {
          setError(
            res?.error ||
              res?.message ||
              "Sayfa bulunamadı veya yayında değil. Admin panelinden ilgili Static Page oluşturun."
          );
          setPage(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Sayfa yüklenemedi.");
          setPage(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  return (
    <SitePageShell>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[280px] gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
          <p className="text-sm text-gray-500 dark:text-slate-400">
            Yükleniyor…
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-4 py-6 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      ) : page ? (
        <article>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
            {page.title}
          </h1>
          <div
            className="static-page-content bg-white dark:bg-slate-800 rounded-xl shadow-md border border-gray-100 dark:border-slate-700 p-6 sm:p-8"
            dangerouslySetInnerHTML={{ __html: page.content }}
          />
        </article>
      ) : null}
    </SitePageShell>
  );
}
