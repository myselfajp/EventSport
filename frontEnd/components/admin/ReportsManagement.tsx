"use client";

import { useCallback, useEffect, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

type ReportRow = {
  _id: string;
  targetType:
    | "user"
    | "coach"
    | "event"
    | "facility"
    | "company"
    | "club"
    | "community";
  targetId: string;
  reason?: string | null;
  details?: string;
  status: "open" | "resolved" | "dismissed";
  reporterIp?: string;
  createdAt: string;
  reporter?: { firstName?: string; lastName?: string; email?: string };
  targetSummary?: {
    label?: string;
    status?: string;
    email?: string;
    owner?: { firstName?: string; lastName?: string; email?: string };
    user?: { firstName?: string; lastName?: string; email?: string };
  };
  resolution?: {
    action?: string;
    note?: string;
    resolvedAt?: string;
    resolvedBy?: { firstName?: string; lastName?: string };
  };
};

const STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
] as const;

const REASON_LABELS: Record<string, string> = {
  impersonation: "Impersonation",
  fake_profile: "Fake profile",
  misleading_event: "Misleading event",
  inappropriate_content: "Inappropriate",
  spam: "Spam",
  harassment: "Harassment",
  other: "Other",
};

const TARGET_TYPE_LABELS: Record<ReportRow["targetType"], string> = {
  user: "User",
  coach: "Coach",
  event: "Event",
  facility: "Facility",
  company: "Company",
  club: "Club",
  community: "Community",
};

export default function ReportsManagement() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actingId, setActingId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchJSON(EP.ADMIN.reports.list, {
        method: "POST",
        body: {
          pageNumber: page,
          perPage: 20,
          status: statusFilter,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (res?.success) {
        setRows(res.data || []);
        setTotalPages(res.totalPages || 1);
      } else {
        setError(res?.message || "Failed to load reports");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const resolve = async (reportId: string, action: string) => {
    const confirmMsg =
      action === "suspend_user"
        ? "Deactivate the reported user's account?"
        : action === "cancel_event"
          ? "Cancel this event?"
          : action === "delete_event"
            ? "Permanently delete this event?"
            : "Dismiss this report?";

    if (!confirm(confirmMsg)) return;

    setActingId(reportId);
    setError("");
    try {
      const res = await fetchJSON(EP.ADMIN.reports.resolve(reportId), {
        method: "PUT",
        body: { action },
      });
      if (!res?.success) {
        throw new Error(res?.message || "Action failed");
      }
      await fetchReports();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActingId(null);
    }
  };

  const formatReporter = (r?: ReportRow["reporter"]) => {
    if (!r) return "—";
    const name = `${r.firstName || ""} ${r.lastName || ""}`.trim();
    return name || r.email || "—";
  };

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
        <Flag className="w-5 h-5 text-amber-500" />
        Reports
      </h2>
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
        User-submitted reports for profiles, coaches, and events. Review and take action when needed.
      </p>

      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
        >
          {STATUS_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search reason, details, ID…"
          className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-500" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-slate-400">No reports in this view.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/80">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Date</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Target</th>
                <th className="text-left px-3 py-2 font-medium">Reason</th>
                <th className="text-left px-3 py-2 font-medium">Reporter</th>
                <th className="text-left px-3 py-2 font-medium">Status</th>
                <th className="text-left px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {rows.map((row) => {
                const busy = actingId === row._id;
                const isOpen = row.status === "open";
                return (
                  <tr key={row._id} className="align-top">
                    <td className="px-3 py-3 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </td>
                    <td className="px-3 py-3">
                      {TARGET_TYPE_LABELS[row.targetType] || row.targetType}
                    </td>
                    <td className="px-3 py-3 max-w-[200px]">
                      <div className="font-medium text-gray-900 dark:text-white truncate">
                        {row.targetSummary?.label || row.targetId}
                      </div>
                      {row.details ? (
                        <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {row.details}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-slate-400">
                      {row.reason ? REASON_LABELS[row.reason] || row.reason : "—"}
                    </td>
                    <td className="px-3 py-3">
                      <div>{formatReporter(row.reporter)}</div>
                      {row.reporter?.email ? (
                        <div className="text-xs text-gray-500">{row.reporter.email}</div>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 capitalize">{row.status}</td>
                    <td className="px-3 py-3">
                      {isOpen ? (
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => resolve(row._id, "dismiss")}
                            className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => resolve(row._id, "suspend_user")}
                            className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            Deactivate user
                          </button>
                          {row.targetType === "event" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => resolve(row._id, "cancel_event")}
                                className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                              >
                                Cancel event
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => resolve(row._id, "delete_event")}
                                className="px-2 py-1 text-xs rounded bg-gray-800 text-white hover:bg-gray-900 disabled:opacity-50"
                              >
                                Delete event
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">
                          {row.resolution?.action?.replace(/_/g, " ") || "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400 py-1">
            Page {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
