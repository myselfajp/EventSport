"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  CATEGORY_LABELS_TR,
  DEFAULT_TITLES_TR,
  SOZLESMELER_SECTION_ANCHORS,
  type ContractCategory,
  type LegalDocType,
} from "@/app/lib/contract-documents";
import SiteFooter from "@/components/SiteFooter";

type CatalogDoc = {
  docType: LegalDocType;
  category: ContractCategory;
  title: string;
  content: string;
  version?: number;
};

type CatalogData = {
  legal: CatalogDoc[];
  gamer: CatalogDoc[];
  coach: CatalogDoc[];
};

const CATEGORY_ORDER: ContractCategory[] = ["legal", "gamer", "coach"];

const PROSE_CLASS =
  "text-sm text-gray-700 dark:text-slate-300 sozlesmeler-prose max-w-none [&_a]:text-cyan-600 dark:[&_a]:text-cyan-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6";

function SectionBody({ html }: { html: string }) {
  return <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SozlesmelerContent() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFatalError("");
      try {
        const res = await fetchJSON(EP.PUBLIC.contractsCatalog, { method: "GET" }, {
          skipAuth: true,
        });
        if (cancelled) return;
        if (res?.success && res?.data) {
          setCatalog(res.data as CatalogData);
        } else {
          setFatalError(res?.message || res?.error || "İçerik yüklenemedi.");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setFatalError(e instanceof Error ? e.message : "İçerik yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const tocEntries: { anchor: string; label: string }[] = [];
  if (catalog) {
    for (const cat of CATEGORY_ORDER) {
      for (const doc of catalog[cat] ?? []) {
        tocEntries.push({
          anchor: SOZLESMELER_SECTION_ANCHORS[doc.docType],
          label: doc.title || DEFAULT_TITLES_TR[doc.docType],
        });
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100">
      <header className="border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Sözleşmeler</h1>
          <Link
            href="/"
            className="text-sm text-cyan-600 dark:text-cyan-400 hover:underline"
          >
            Ana sayfa
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8 space-y-12">
        <nav className="text-sm bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <p className="font-medium text-gray-700 dark:text-slate-300 mb-2">
            İçindekiler
          </p>
          {CATEGORY_ORDER.map((cat) => {
            const docs = catalog?.[cat] ?? [];
            if (docs.length === 0) return null;
            return (
              <div key={cat} className="mt-3">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                  {CATEGORY_LABELS_TR[cat]}
                </p>
                <ul className="list-disc list-inside space-y-1 text-cyan-600 dark:text-cyan-400">
                  {docs.map((doc) => {
                    const anchor = SOZLESMELER_SECTION_ANCHORS[doc.docType];
                    const label = doc.title || DEFAULT_TITLES_TR[doc.docType];
                    return (
                      <li key={doc.docType}>
                        <a href={`#${anchor}`} className="hover:underline">
                          {label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            Tüm metinler Admin → Contracts üzerinden yönetilir. Eski statik adresler bu sayfaya
            yönlendirilir.
          </p>
        </nav>

        {fatalError && (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {fatalError}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Yükleniyor…
              </p>
            </div>
          </div>
        )}

        {!loading && catalog && (
          <>
            {CATEGORY_ORDER.map((cat) => {
              const docs = catalog[cat] ?? [];
              if (docs.length === 0) return null;
              return (
                <section key={cat} className="space-y-8">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                    {CATEGORY_LABELS_TR[cat]}
                  </h2>
                  {docs.map((doc) => {
                    const anchor = SOZLESMELER_SECTION_ANCHORS[doc.docType];
                    const title = doc.title || DEFAULT_TITLES_TR[doc.docType];
                    return (
                      <article
                        key={doc.docType}
                        id={anchor}
                        className="scroll-mt-24 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                          <h3 className="text-xl font-semibold">{title}</h3>
                          <Link
                            href={`/legal/${doc.docType}`}
                            className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                          >
                            Tam sayfa
                          </Link>
                        </div>
                        {doc.version != null && (
                          <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                            Yayında sürüm: v{doc.version}
                          </p>
                        )}
                        <SectionBody html={doc.content ?? ""} />
                      </article>
                    );
                  })}
                </section>
              );
            })}

            {tocEntries.length === 0 && !fatalError && (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                Henüz yayımlanmış sözleşme yok. Yönetici panelinden Contracts bölümünde ilgili
                belgeleri oluşturup aktif yapın.
              </p>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
