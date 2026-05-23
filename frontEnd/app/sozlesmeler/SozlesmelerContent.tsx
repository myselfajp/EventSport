"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { SOZLESMELER_STATIC_SLUGS } from "@/app/lib/sozlesmeler-static-slugs";
import SiteFooter from "@/components/SiteFooter";

type LegalDocType = "kvkk" | "terms" | "distance_selling" | "event_contract";

const STATIC_SECTIONS = [
  {
    id: "antrenor-sozlesmesi",
    slug: SOZLESMELER_STATIC_SLUGS[0],
    defaultTitle: "Antrenör Sözleşmesi",
  },
  {
    id: "ek-1",
    slug: SOZLESMELER_STATIC_SLUGS[1],
    defaultTitle: "Ek — 1 Antrenman Kuralları",
  },
  {
    id: "ek-2",
    slug: SOZLESMELER_STATIC_SLUGS[2],
    defaultTitle: "Ek — 2 Cezai Şartlar",
  },
  {
    id: "ek-3",
    slug: SOZLESMELER_STATIC_SLUGS[3],
    defaultTitle: "Ek — 3 Antrenör Belgeleri",
  },
  {
    id: "mesafeli-satis-statik",
    slug: SOZLESMELER_STATIC_SLUGS[4],
    defaultTitle: "Mesafeli Satış Sözleşmesi",
  },
  {
    id: "etkinlik-satin-alma-statik",
    slug: SOZLESMELER_STATIC_SLUGS[5],
    defaultTitle: "Etkinlik ve Satın Alma Koşulları",
  },
] as const;

/** Admin → Legal: aktif sürüm (aynı kaynak `/legal/...` sayfaları). */
const LEGAL_SECTIONS: {
  id: string;
  docType: LegalDocType;
  defaultTitle: string;
}[] = [
  { id: "kvkk", docType: "kvkk", defaultTitle: "KVKK Aydınlatma Metni" },
  { id: "terms", docType: "terms", defaultTitle: "Şartlar ve Koşullar" },
  {
    id: "mesafeli-satis",
    docType: "distance_selling",
    defaultTitle: "Mesafeli Satış Sözleşmesi",
  },
  {
    id: "etkinlik-satin-alma",
    docType: "event_contract",
    defaultTitle: "Etkinlik Sözleşmesi",
  },
];

type SectionState = {
  title: string;
  html: string;
  missing: boolean;
  version?: number;
};

function staticKey(slug: string) {
  return `static:${slug}`;
}

function legalKey(docType: LegalDocType) {
  return `legal:${docType}`;
}

const PROSE_CLASS =
  "text-sm text-gray-700 dark:text-slate-300 sozlesmeler-prose max-w-none [&_a]:text-cyan-600 dark:[&_a]:text-cyan-400 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6";

function SectionBody({ html }: { html: string }) {
  return <div className={PROSE_CLASS} dangerouslySetInnerHTML={{ __html: html }} />;
}

export default function SozlesmelerContent() {
  const [sections, setSections] = useState<Record<string, SectionState>>({});
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setFatalError("");
      try {
        const [staticResults, legalResults] = await Promise.all([
          Promise.all(
            STATIC_SECTIONS.map(async ({ slug, defaultTitle }) => {
              const res = await fetchJSON(EP.PUBLIC.staticPageByName(slug), {
                method: "GET",
              });
              if (cancelled) return { key: staticKey(slug), state: null as SectionState | null };
              if (res?.success && res?.data?.content != null) {
                return {
                  key: staticKey(slug),
                  state: {
                    title: res.data.title || defaultTitle,
                    html: String(res.data.content),
                    missing: false,
                  },
                };
              }
              return {
                key: staticKey(slug),
                state: {
                  title: defaultTitle,
                  html: "",
                  missing: true,
                },
              };
            })
          ),
          Promise.all(
            LEGAL_SECTIONS.map(async ({ docType, defaultTitle }) => {
              const res = await fetchJSON(
                EP.LEGAL.getActive(docType),
                { method: "GET" },
                { skipAuth: true }
              );
              if (cancelled) return { key: legalKey(docType), state: null as SectionState | null };
              if (res?.success && res?.data) {
                return {
                  key: legalKey(docType),
                  state: {
                    title: String(res.data.title || defaultTitle),
                    html: String(res.data.content ?? ""),
                    missing: false,
                    version:
                      typeof res.data.version === "number"
                        ? res.data.version
                        : undefined,
                  },
                };
              }
              return {
                key: legalKey(docType),
                state: {
                  title: defaultTitle,
                  html: "",
                  missing: true,
                },
              };
            })
          ),
        ]);

        if (cancelled) return;
        const next: Record<string, SectionState> = {};
        for (const { key, state } of [...staticResults, ...legalResults]) {
          if (state) next[key] = state;
        }
        setSections(next);
      } catch (e: unknown) {
        if (!cancelled) {
          setFatalError(
            e instanceof Error ? e.message : "İçerik yüklenemedi."
          );
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

  const tocLegal = LEGAL_SECTIONS.map((s) => ({
    id: s.id,
    label: sections[legalKey(s.docType)]?.title ?? s.defaultTitle,
  }));

  const tocStatic = STATIC_SECTIONS.map((s) => ({
    id: s.id,
    label: sections[staticKey(s.slug)]?.title ?? s.defaultTitle,
  }));

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
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-3 mb-1">
            Legal (Admin → Legal)
          </p>
          <ul className="list-disc list-inside space-y-1 text-cyan-600 dark:text-cyan-400">
            {tocLegal.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-3 mb-1">
            Statik sözleşmeler (Admin → Statik Sayfalar)
          </p>
          <ul className="list-disc list-inside space-y-1 text-cyan-600 dark:text-cyan-400">
            {tocStatic.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="hover:underline">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
            KVKK, şartlar, mesafeli satış ve etkinlik metinleri{" "}
            <strong>Legal</strong> bölümünden; antrenör ve ek metinler{" "}
            <strong>Statik Sayfalar</strong> (
            <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded text-[11px]">
              {SOZLESMELER_STATIC_SLUGS.join(", ")}
            </code>
            ) üzerinden düzenlenir.
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

        {!loading && (
          <>
            <section className="space-y-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Legal belgeleri
              </h2>
              {LEGAL_SECTIONS.map((s) => {
                const data = sections[legalKey(s.docType)];
                return (
                  <article
                    key={s.id}
                    id={s.id}
                    className="scroll-mt-24 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm"
                  >
                    <h3 className="text-xl font-semibold mb-1">
                      {data?.title ?? s.defaultTitle}
                    </h3>
                    {data?.version != null && !data.missing && (
                      <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                        Yayında sürüm: v{data.version}
                      </p>
                    )}
                    {data?.missing ? (
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Bu belge için aktif sürüm yok. Yönetici panelinde{" "}
                        <strong>Legal</strong> bölümünden ilgili tipe bir sürüm
                        oluşturup <strong>Set Active</strong> yapın.
                      </p>
                    ) : (
                      <SectionBody html={data?.html ?? ""} />
                    )}
                  </article>
                );
              })}
            </section>

            <section className="space-y-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
                Statik sözleşmeler
              </h2>
              {STATIC_SECTIONS.map((s) => {
                const data = sections[staticKey(s.slug)];
                return (
                  <article
                    key={s.id}
                    id={s.id}
                    className="scroll-mt-24 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm"
                  >
                    <h3 className="text-xl font-semibold mb-4">
                      {data?.title ?? s.defaultTitle}
                    </h3>
                    {data?.missing ? (
                      <p className="text-sm text-gray-600 dark:text-slate-400">
                        Bu bölüm için henüz yayımlanmış statik sayfa yok.{" "}
                        <strong>Statik Sayfalar</strong> bölümünden{" "}
                        <code className="bg-gray-100 dark:bg-slate-700 px-1 rounded">
                          {s.slug}
                        </code>{" "}
                        adında aktif sayfa oluşturun.
                      </p>
                    ) : (
                      <SectionBody html={data?.html ?? ""} />
                    )}
                  </article>
                );
              })}
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
