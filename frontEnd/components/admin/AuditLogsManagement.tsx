"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileClock, Search, X } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

type AuditRole = "athlete" | "coach" | "performance";

type AuditUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

type AuditRow = {
  _id: string;
  actorUser?: AuditUser | string | null;
  actorRole: string;
  targetUser?: AuditUser | string | null;
  targetRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  description?: string;
  changedFields?: string[];
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  createdAt: string;
};

const ROLE_TABS: { key: AuditRole; label: string }[] = [
  { key: "athlete", label: "Athlete Logs" },
  { key: "coach", label: "Coach Logs" },
  { key: "performance", label: "Performance Team Logs" },
];

function userLabel(user: AuditRow["actorUser"]): string {
  if (!user) return "System";
  if (typeof user === "string") return user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name ? `${name}${user.email ? ` (${user.email})` : ""}` : user.email || user._id;
}

function actionLabel(action: string): string {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString("tr-TR");
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  if (value == null || (typeof value === "object" && Object.keys(value as object).length === 0)) {
    return null;
  }
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
        {title}
      </h4>
      <pre className="max-h-64 overflow-auto rounded-lg border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900 p-3 text-xs whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </section>
  );
}

export default function AuditLogsManagement() {
  const [role, setRole] = useState<AuditRole>("athlete");
  const [items, setItems] = useState<AuditRow[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<AuditRow | null>(null);

  useEffect(() => {
    void fetchJSON(EP.ADMIN.auditLogs.catalog, { method: "GET" })
      .then((res) => {
        if (res?.success) {
          setActions(Array.isArray(res.data?.actions) ? res.data.actions : []);
          setEntityTypes(Array.isArray(res.data?.entityTypes) ? res.data.entityTypes : []);
        }
      })
      .catch(() => {
        // The list request below presents authorization/network errors.
      });
  }, []);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(
        EP.ADMIN.auditLogs.list({
          role,
          action: action || undefined,
          entityType: entityType || undefined,
          userSearch: appliedSearch || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
          limit: 50,
        }),
        { method: "GET" }
      );
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Audit logs could not be loaded.");
      }
      setItems(Array.isArray(res.data?.items) ? res.data.items : []);
      setTotalPages(res.data?.pagination?.pages ?? 1);
      setTotal(res.data?.pagination?.total ?? 0);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : "Audit logs could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [role, action, entityType, appliedSearch, from, to, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const roleActions = useMemo(() => {
    const roleHints: Record<AuditRole, string[]> = {
      athlete: ["USER_PROFILE", "ACCOUNT_", "ATHLETE", "EVENT_JOINED", "EVENT_SERIES_JOINED", "EVENT_CHECKED_IN", "EVENT_PAYMENT", "SERVICE_REQUEST", "SERVICE_RESPONSE_SELECTED", "REPORT"],
      coach: ["USER_PROFILE", "ACCOUNT_", "COACH", "EVENT_", "SERVICE_RESPONSE", "REPLY_CREDIT", "SUBSCRIPTION", "FACILITY", "COMPANY", "CLUB", "GROUP", "PROVIDER_ROLE", "REPORT"],
      performance: ["USER_PROFILE", "ACCOUNT_", "PERFORMANCE", "EVENT_", "SERVICE_RESPONSE", "REPLY_CREDIT", "SUBSCRIPTION", "FACILITY", "COMPANY", "PROVIDER_ROLE", "REPORT"],
    };
    return actions.filter((item) => roleHints[role].some((hint) => item.includes(hint)));
  }, [actions, role]);

  const switchRole = (nextRole: AuditRole) => {
    setRole(nextRole);
    setAction("");
    setPage(1);
    setSelected(null);
  };

  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setAppliedSearch(userSearch.trim());
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileClock className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
          Business Audit Logs
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
          Append-only event, profile, service request, credit and provider activity. Login/logout
          and direct-message activity are intentionally excluded.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-slate-700 pb-2">
        {ROLE_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => switchRole(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              role === tab.key
                ? "bg-cyan-600 text-white"
                : "bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form
        onSubmit={submitSearch}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4"
      >
        <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
          User
          <input
            value={userSearch}
            onChange={(event) => setUserSearch(event.target.value)}
            placeholder="Name or email"
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
          Action
          <select
            value={action}
            onChange={(event) => {
              setAction(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">All actions</option>
            {roleActions.map((item) => (
              <option key={item} value={item}>
                {actionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
          Entity
          <select
            value={entityType}
            onChange={(event) => {
              setEntityType(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">All entities</option>
            {entityTypes.map((item) => (
              <option key={item} value={item}>
                {actionLabel(item)}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
          From
          <input
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-gray-600 dark:text-slate-300">
          To
          <div className="mt-1 flex gap-2">
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <button
              type="submit"
              aria-label="Search audit logs"
              className="rounded-lg bg-cyan-600 px-3 text-white hover:bg-cyan-700"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </label>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between bg-gray-50 dark:bg-slate-700/50 px-4 py-3">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-200">
            {total.toLocaleString("tr-TR")} records
          </span>
          <span className="text-xs text-gray-500 dark:text-slate-400">Newest first</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white dark:bg-slate-800 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    No audit records found for this filter.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row._id}
                    className="border-t border-gray-100 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{formatDate(row.createdAt)}</td>
                    <td className="px-4 py-3 max-w-56">
                      <div className="truncate font-medium" title={userLabel(row.actorUser)}>
                        {userLabel(row.actorUser)}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400 capitalize">
                        {row.actorRole}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-cyan-50 dark:bg-cyan-900/30 px-2.5 py-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">
                        {actionLabel(row.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-72">
                      <div className="truncate" title={row.description}>
                        {row.description || "—"}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-slate-400">
                        {row.entityType}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-52 truncate" title={userLabel(row.targetUser)}>
                      {row.targetUser ? userLabel(row.targetUser) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelected(row)}
                        className="text-cyan-600 dark:text-cyan-400 font-medium hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {actionLabel(selected.action)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">
                  {formatDate(selected.createdAt)} · {selected.entityType}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700"
                aria-label="Close audit details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">Actor</dt>
                <dd className="font-medium">{userLabel(selected.actorUser)}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">Target</dt>
                <dd className="font-medium">
                  {selected.targetUser ? userLabel(selected.targetUser) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">Entity ID</dt>
                <dd className="font-mono text-xs break-all">{selected.entityId || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">Request ID</dt>
                <dd className="font-mono text-xs break-all">{selected.requestId || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">IP address</dt>
                <dd className="font-mono text-xs break-all">{selected.ipAddress || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-slate-400">User agent</dt>
                <dd className="text-xs break-all">{selected.userAgent || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-gray-500 dark:text-slate-400">Description</dt>
                <dd>{selected.description || "—"}</dd>
              </div>
              {selected.changedFields && selected.changedFields.length > 0 && (
                <div className="sm:col-span-2">
                  <dt className="text-xs text-gray-500 dark:text-slate-400">Changed fields</dt>
                  <dd>{selected.changedFields.join(", ")}</dd>
                </div>
              )}
            </dl>

            <div className="space-y-4">
              <JsonBlock title="Before" value={selected.before} />
              <JsonBlock title="After" value={selected.after} />
              <JsonBlock title="Metadata" value={selected.metadata} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
