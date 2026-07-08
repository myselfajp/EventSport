"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, Download, RefreshCw } from "lucide-react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

type DailyPoint = { date: string; count: number };
type SlideRow = {
  slideId: string;
  title: string;
  ctaHref: string;
  isActive: boolean;
  allTimeClicks: number;
  periodClicks: number;
  lastClickedAt: string | null;
};
type DailyBySlideRow = {
  date: string;
  slideId: string;
  slideTitle: string;
  count: number;
};

type AnalyticsData = {
  range: {
    from: string;
    to: string;
    days: number;
    slideId: string | null;
  };
  summary: {
    periodClicks: number;
    loggedInClicks: number;
  };
  daily: DailyPoint[];
  dailyBySlide: DailyBySlideRow[];
  bySlide: SlideRow[];
};

const DAY_OPTIONS = [7, 30, 90] as const;

function formatShortDate(iso: string) {
  return iso.slice(5);
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function downloadCsv(data: AnalyticsData) {
  const lines = ["date,slide_id,slide_title,clicks"];
  for (const row of data.dailyBySlide) {
    const title = row.slideTitle.replace(/"/g, '""');
    lines.push(`${row.date},${row.slideId},"${title}",${row.count}`);
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `hero-banner-clicks-${data.range.from.slice(0, 10)}_${data.range.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const PAGE_LABELS: Record<"home" | "blog" | "news", string> = {
  home: "Home page",
  blog: "Blog page",
  news: "News page",
};

export default function DashboardHeroStatistics({
  context = "home",
}: {
  context?: "home" | "blog" | "news";
}) {
  const [days, setDays] = useState<number>(30);
  const [slideId, setSlideId] = useState("");
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(
        EP.ADMIN.dashboardHeroSlides.analytics({
          context,
          days,
          ...(slideId ? { slideId } : {}),
        }),
        { method: "GET" }
      );
      if (res?.success && res.data) {
        setData(res.data as AnalyticsData);
      } else {
        setError(res?.message || res?.error || "Failed to load analytics");
        setData(null);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [context, days, slideId]);

  useEffect(() => {
    void load();
  }, [load]);

  const maxDaily = Math.max(...(data?.daily.map((d) => d.count) ?? [0]), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-slate-200">
          <BarChart3 className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          <div>
            <h2 className="text-lg font-semibold">Banner click statistics</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Tracked clicks from EventSport redirect links ({PAGE_LABELS[context]} hero).
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white"
          >
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </select>
          <select
            value={slideId}
            onChange={(e) => setSlideId(e.target.value)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-white max-w-[220px]"
          >
            <option value="">All slides</option>
            {(data?.bySlide ?? []).map((s) => (
              <option key={s.slideId} value={s.slideId}>
                {s.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          {data && data.dailyBySlide.length > 0 ? (
            <button
              type="button"
              onClick={() => downloadCsv(data)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-500 border-t-transparent" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5">
              <p className="text-sm text-gray-500 dark:text-slate-400">Clicks in period</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                {data.summary.periodClicks}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                {formatShortDate(data.range.from)} — {formatShortDate(data.range.to)} (UTC)
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5">
              <p className="text-sm text-gray-500 dark:text-slate-400">All-time (slide counters)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1 tabular-nums">
                {data.bySlide.reduce((n, s) => n + s.allTimeClicks, 0)}
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-2">
                Sum of per-slide totals (includes clicks before logging started)
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 p-5">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-slate-200 mb-4">
              Daily clicks
            </h3>
            {data.daily.every((d) => d.count === 0) ? (
              <p className="text-sm text-gray-500 dark:text-slate-400 py-8 text-center">
                No clicks in this period. Clicks are logged from the banner tracking redirect.
              </p>
            ) : (
              <div className="flex items-end gap-1 h-36 overflow-x-auto pb-1">
                {data.daily.map((d) => (
                  <div
                    key={d.date}
                    className="flex flex-col items-center justify-end flex-1 min-w-[28px] max-w-[48px] h-full"
                    title={`${d.date}: ${d.count}`}
                  >
                    <span className="text-[10px] text-gray-500 dark:text-slate-400 mb-1 tabular-nums">
                      {d.count > 0 ? d.count : ""}
                    </span>
                    <div
                      className="w-full rounded-t bg-cyan-500 dark:bg-cyan-600 min-h-[2px] transition-all"
                      style={{
                        height: `${Math.max(4, (d.count / maxDaily) * 100)}%`,
                      }}
                    />
                    <span className="text-[9px] text-gray-400 dark:text-slate-500 mt-1 rotate-0 truncate w-full text-center">
                      {formatShortDate(d.date)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-slate-800/80 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                    Slide
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                    Period
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                    All-time
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                    Last click
                  </th>
                  <th className="px-4 py-3 font-medium text-gray-600 dark:text-slate-300">
                    Link
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {data.bySlide.map((s) => (
                  <tr key={s.slideId} className="bg-white dark:bg-slate-900/40">
                    <td className="px-4 py-3 text-gray-900 dark:text-slate-100">
                      <span className="font-medium">{s.title}</span>
                      {!s.isActive ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-slate-400">
                          inactive
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold text-cyan-700 dark:text-cyan-400">
                      {s.periodClicks}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-gray-700 dark:text-slate-300">
                      {s.allTimeClicks}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-slate-400 text-xs whitespace-nowrap">
                      {formatDateTime(s.lastClickedAt)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-slate-400 max-w-[160px] truncate">
                      {s.ctaHref || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
