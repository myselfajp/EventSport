"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { replaceContractPlaceholders } from "@/app/lib/contract-placeholders";

type AcceptanceUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};

type AcceptanceRow = {
  _id: string;
  contractKey: string;
  source: string;
  title: string;
  version?: number | null;
  context: string;
  acceptedAt: string;
  user?: AcceptanceUser | string | null;
  visitorKey?: string | null;
  renderedContent?: string | null;
  signerName?: string | null;
  signerEmail?: string | null;
  signerPhone?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  cookiePreferences?: {
    choice?: "accept_all" | "essential_only" | "custom";
    functional?: boolean;
    analytics?: boolean;
    marketing?: boolean;
  } | null;
  legalDocumentId?: { docType?: string; version?: number; title?: string; content?: string } | string;
  staticPageId?: { name?: string; title?: string } | string;
  event?: { name?: string } | string;
};

const CONTEXT_LABELS: Record<string, string> = {
  signup: "Sign-up",
  event_reservation: "Event reservation",
  coach_profile: "Coach profile",
  marketing: "Marketing consent",
  cookie_consent: "Cookie consent",
  welcome_page: "Welcome page",
};

function formatUser(
  u: AcceptanceRow["user"],
  visitorKey?: string | null
): string {
  if (u && typeof u === "object") {
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return name ? `${name} (${u.email ?? ""})` : u.email ?? "—";
  }
  if (typeof u === "string" && u) return u;
  if (visitorKey) return `Anonymous (${visitorKey.slice(-8)})`;
  return "Anonymous visitor";
}

function formatCookiePreferences(row: AcceptanceRow): string {
  const prefs = row.cookiePreferences;
  if (!prefs) return "—";
  const choiceLabels: Record<string, string> = {
    accept_all: "Accept all",
    essential_only: "Essential only",
    custom: "Custom",
  };
  const choice = prefs.choice ? choiceLabels[prefs.choice] ?? prefs.choice : "—";
  const flags = [
    prefs.functional ? "Functional" : null,
    prefs.analytics ? "Analytics" : null,
    prefs.marketing ? "Marketing" : null,
  ].filter(Boolean);
  return flags.length > 0 ? `${choice} (${flags.join(", ")})` : choice;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("tr-TR");
  } catch {
    return iso;
  }
}

export default function ContractAcceptanceManagement() {
  const [items, setItems] = useState<AcceptanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [contractKey, setContractKey] = useState("");
  const [context, setContext] = useState("");
  const [userId, setUserId] = useState("");
  const [viewingContract, setViewingContract] = useState<AcceptanceRow | null>(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(
        EP.ADMIN.contractAcceptances.list({
          page,
          limit: 50,
          contractKey: contractKey || undefined,
          context: context || undefined,
          userId: userId.trim() || undefined,
        }),
        { method: "GET" }
      );
      if (res?.success && res?.data) {
        setItems(res.data.items ?? []);
        setTotalPages(res.data.pagination?.pages ?? 1);
      } else {
        setError(res?.message || res?.error || "Could not load list");
        setItems([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Could not load list");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, contractKey, context, userId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const applyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-slate-400 max-w-3xl">
        Audit log of user contract acceptances: sign-up (KVKK / terms), event registration
        (distance selling / event agreement), coach profile, marketing consent, and cookie preferences.
      </p>

      <form
        onSubmit={applyFilters}
        className="flex flex-wrap gap-3 items-end bg-gray-50 dark:bg-slate-800/50 p-4 rounded-lg border border-gray-200 dark:border-slate-700"
      >
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="MongoDB user _id"
            className="w-56 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            Contract key
          </label>
          <input
            type="text"
            value={contractKey}
            onChange={(e) => setContractKey(e.target.value)}
            placeholder="kvkk, terms, cookie_consent…"
            className="w-48 px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
            Context
          </label>
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          >
            <option value="">All</option>
            {Object.entries(CONTEXT_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-cyan-600 text-white text-sm rounded-lg hover:bg-cyan-700"
        >
          Filter
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700 text-left">
                  <th className="p-3">Date</th>
                  <th className="p-3">User</th>
                  <th className="p-3">Contract</th>
                  <th className="p-3">Version</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Context</th>
                  <th className="p-3">Preferences</th>
                  <th className="p-3">Event</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr
                    key={row._id}
                    className="border-t border-gray-200 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-800"
                  >
                    <td className="p-3 whitespace-nowrap text-xs">
                      {formatDate(row.acceptedAt)}
                    </td>
                    <td className="p-3 text-xs max-w-[200px] truncate" title={formatUser(row.user, row.visitorKey)}>
                      {formatUser(row.user, row.visitorKey)}
                    </td>
                    <td className="p-3">
                      <div className="font-medium">{row.title}</div>
                      <code className="text-[10px] text-gray-500">{row.contractKey}</code>
                    </td>
                    <td className="p-3 text-xs">
                      {row.version != null ? `v${row.version}` : "—"}
                    </td>
                    <td className="p-3 text-xs">{row.source}</td>
                    <td className="p-3 text-xs">
                      {CONTEXT_LABELS[row.context] ?? row.context}
                    </td>
                    <td className="p-3 text-xs max-w-[220px]">
                      {row.context === "cookie_consent"
                        ? formatCookiePreferences(row)
                        : "—"}
                    </td>
                    <td className="p-3 text-xs">
                      {row.event && typeof row.event === "object"
                        ? row.event.name ?? "—"
                        : "—"}
                    </td>
                    <td className="p-3 text-xs text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewingContract(row)}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-medium transition-colors"
                      >
                        View Contract
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600 dark:text-slate-400 py-1">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 text-sm rounded border disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* View Contract Modal */}
      {viewingContract && (
        <div className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-slate-700 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {viewingContract.title || viewingContract.contractKey}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Accepted on {formatDate(viewingContract.acceptedAt)} • {CONTEXT_LABELS[viewingContract.context] ?? viewingContract.context}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Signer Info Summary Banner */}
            <div className="bg-cyan-50 dark:bg-cyan-950/40 border-b border-cyan-100 dark:border-cyan-900/50 px-6 py-3 text-xs text-cyan-900 dark:text-cyan-200 flex flex-wrap gap-x-6 gap-y-1.5">
              <span><strong>Signer:</strong> {viewingContract.signerName || (typeof viewingContract.user === "object" && viewingContract.user ? [viewingContract.user.firstName, viewingContract.user.lastName].filter(Boolean).join(" ") : "—")}</span>
              <span><strong>Email:</strong> {viewingContract.signerEmail || (typeof viewingContract.user === "object" && viewingContract.user?.email) || "—"}</span>
              <span><strong>Phone:</strong> {viewingContract.signerPhone || (typeof viewingContract.user === "object" && viewingContract.user?.phone) || "—"}</span>
              {viewingContract.event && typeof viewingContract.event === "object" && (
                <span><strong>Event:</strong> {viewingContract.event.name}</span>
              )}
              {viewingContract.ip && <span><strong>IP:</strong> {viewingContract.ip}</span>}
              {viewingContract.version != null && <span><strong>Version:</strong> v{viewingContract.version}</span>}
            </div>

            {/* Contract Body */}
            <div className="flex-1 overflow-y-auto p-6 text-sm text-gray-800 dark:text-slate-200 leading-relaxed bg-white dark:bg-slate-800">
              {viewingContract.renderedContent ? (
                <div dangerouslySetInnerHTML={{ __html: viewingContract.renderedContent }} />
              ) : typeof viewingContract.legalDocumentId === "object" && viewingContract.legalDocumentId?.content ? (
                <div
                  dangerouslySetInnerHTML={{
                    __html: replaceContractPlaceholders(
                      viewingContract.legalDocumentId.content,
                      typeof viewingContract.user === "object" ? viewingContract.user : null,
                      {
                        eventName: typeof viewingContract.event === "object" ? viewingContract.event?.name : undefined,
                        date: viewingContract.acceptedAt,
                      }
                    ),
                  }}
                />
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                  <p>No contract text snapshot saved for this record.</p>
                  <p className="text-xs mt-1 text-gray-400">Key: {viewingContract.contractKey} • Version: {viewingContract.version ?? "N/A"}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setViewingContract(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
