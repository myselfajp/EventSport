"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { getMe } from "@/app/lib/auth-api";
import { EP } from "@/app/lib/endpoints";
import {
  CATEGORY_LABELS,
  CONTRACTS_SECTION_ANCHORS,
  DOC_TYPE_LABELS,
  type ContractCategory,
  type LegalDocType,
  isLegalDocType,
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
  "text-sm text-gray-700 dark:text-slate-300 contracts-prose max-w-none [&_a]:text-cyan-600 dark:[&_a]:text-cyan-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6";

function SectionBody({ html }: { html: string }) {
  return <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
}

function slugToDocType(slug: string): LegalDocType | null {
  if (!slug) return null;
  if (isLegalDocType(slug)) return slug;
  for (const [docType, anchor] of Object.entries(CONTRACTS_SECTION_ANCHORS)) {
    if (anchor === slug) return docType as LegalDocType;
  }
  return null;
}

function getAllDocs(catalog: CatalogData): CatalogDoc[] {
  return CATEGORY_ORDER.flatMap((cat) => catalog[cat] ?? []);
}

function findDoc(catalog: CatalogData, docType: LegalDocType): CatalogDoc | undefined {
  return getAllDocs(catalog).find((d) => d.docType === docType);
}

export default function ContractsContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");
  const [activeDocType, setActiveDocType] = useState<LegalDocType | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<ContractCategory, boolean>>({
    legal: true,
    gamer: true,
    coach: true,
  });

  useEffect(() => {
    void queryClient.prefetchQuery({
      queryKey: ["auth", "me"],
      queryFn: getMe,
    });
  }, [queryClient]);

  const goHome = () => {
    void queryClient
      .prefetchQuery({
        queryKey: ["auth", "me"],
        queryFn: getMe,
      })
      .finally(() => {
        router.push("/");
      });
  };

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
          setFatalError(res?.message || res?.error || "Failed to load content.");
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setFatalError(e instanceof Error ? e.message : "Failed to load content.");
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

  const resolveDocFromUrl = useCallback((data: CatalogData): LegalDocType | null => {
    if (typeof window === "undefined") return null;
    const hash = window.location.hash.replace(/^#/, "");
    const queryDoc = new URLSearchParams(window.location.search).get("doc") ?? "";
    const slug = queryDoc || hash;
    const docType = slugToDocType(slug);
    if (docType && findDoc(data, docType)) return docType;
    const first = getAllDocs(data)[0];
    return first?.docType ?? null;
  }, []);

  useEffect(() => {
    if (!catalog) return;
    const apply = () => {
      const resolved = resolveDocFromUrl(catalog);
      if (resolved) {
        setActiveDocType(resolved);
        const cat = CATEGORY_ORDER.find((c) =>
          (catalog[c] ?? []).some((d) => d.docType === resolved)
        );
        if (cat) {
          setExpandedCategories((prev) => ({ ...prev, [cat]: true }));
        }
      }
    };
    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, [catalog, resolveDocFromUrl]);

  const selectDoc = useCallback((docType: LegalDocType) => {
    setActiveDocType(docType);
    const anchor = CONTRACTS_SECTION_ANCHORS[docType];
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `/contracts#${anchor}`);
    }
  }, []);

  const toggleCategory = (cat: ContractCategory) => {
    setExpandedCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  const activeDoc = useMemo(() => {
    if (!catalog || !activeDocType) return null;
    return findDoc(catalog, activeDocType) ?? null;
  }, [catalog, activeDocType]);

  const allDocs = catalog ? getAllDocs(catalog) : [];

  const renderSidebarNav = (className = "") => (
    <nav className={className} aria-label="Agreement documents">
      {CATEGORY_ORDER.map((cat) => {
        const docs = catalog?.[cat] ?? [];
        if (docs.length === 0) return null;
        const expanded = expandedCategories[cat];
        return (
          <div key={cat} className="border-b border-gray-100 dark:border-slate-700/80 last:border-b-0">
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors"
            >
              <span>{CATEGORY_LABELS[cat]}</span>
              {expanded ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-gray-400 dark:text-slate-500" />
              )}
            </button>
            {expanded && (
              <ul className="pb-2">
                {docs.map((doc) => {
                  const label = doc.title || DOC_TYPE_LABELS[doc.docType];
                  const isActive = activeDocType === doc.docType;
                  return (
                    <li key={doc.docType}>
                      <button
                        type="button"
                        onClick={() => selectDoc(doc.docType)}
                        className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left text-sm transition-colors border-l-2 ${
                          isActive
                            ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/25 text-cyan-800 dark:text-cyan-200 font-medium"
                            : "border-transparent text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        <FileText
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            isActive
                              ? "text-cyan-600 dark:text-cyan-400"
                              : "text-gray-400 dark:text-slate-500"
                          }`}
                        />
                        <span className="leading-snug">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors">
      <header className="shrink-0 border-b border-gray-200 dark:border-slate-700 bg-white/85 dark:bg-slate-800/85 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Agreements</h1>
          <button
            type="button"
            onClick={goHome}
            className="text-sm text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
          >
            ← Home
          </button>
        </div>
      </header>

      {fatalError && (
        <div className="max-w-7xl mx-auto w-full px-4 pt-4">
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            {fatalError}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex-1 flex justify-center items-center py-24">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
            <p className="text-sm text-gray-500 dark:text-slate-400">Loading…</p>
          </div>
        </div>
      )}

      {!loading && catalog && allDocs.length > 0 && (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 sm:py-8 min-h-0">
          {/* Mobile document picker */}
          <div className="md:hidden mb-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-3">
            <label htmlFor="contracts-mobile-select" className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">
              Select agreement
            </label>
            <select
              id="contracts-mobile-select"
              value={activeDocType ?? ""}
              onChange={(e) => {
                const docType = slugToDocType(e.target.value);
                if (docType) selectDoc(docType);
              }}
              className="w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2.5 text-sm text-gray-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              {CATEGORY_ORDER.map((cat) => {
                const docs = catalog[cat] ?? [];
                if (docs.length === 0) return null;
                return (
                  <optgroup key={cat} label={CATEGORY_LABELS[cat]}>
                    {docs.map((doc) => (
                      <option key={doc.docType} value={doc.docType}>
                        {doc.title || DOC_TYPE_LABELS[doc.docType]}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>

          <div className="flex flex-col md:flex-row gap-4 md:gap-6 min-h-[50vh]">
            {/* Desktop sidebar */}
            <aside className="hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
              <div className="px-4 py-3.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                  Contents
                </p>
              </div>
              {renderSidebarNav("flex-1 overflow-y-auto")}
            </aside>

            {/* Content area */}
            <main className="flex-1 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm overflow-y-auto min-h-[50vh]">
              {activeDoc ? (
                <article className="px-4 sm:px-8 py-6 sm:py-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">
                      {activeDoc.title || DOC_TYPE_LABELS[activeDoc.docType]}
                    </h2>
                    <Link
                      href={`/legal/${activeDoc.docType}`}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
                    >
                      Full page
                    </Link>
                  </div>
                  {activeDoc.version != null && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-6">
                      Published version: v{activeDoc.version}
                    </p>
                  )}
                  <div className="rounded-lg border border-gray-100 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 p-5 sm:p-8">
                    <SectionBody html={activeDoc.content ?? ""} />
                  </div>
                </article>
              ) : (
                <div className="px-4 py-16 text-center text-sm text-gray-500 dark:text-slate-400">
                  Select a document from the menu.
                </div>
              )}
            </main>
          </div>
        </div>
      )}

      {!loading && catalog && allDocs.length === 0 && !fatalError && (
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16">
          <p className="text-sm text-gray-600 dark:text-slate-400">
            No published agreements yet. Create and activate the relevant documents in Admin →
            Contracts.
          </p>
        </main>
      )}

      <SiteFooter />
    </div>
  );
}
