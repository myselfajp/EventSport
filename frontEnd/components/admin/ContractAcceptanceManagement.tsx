"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

type AcceptanceUser = {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
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
  cookiePreferences?: {
    choice?: "accept_all" | "essential_only" | "custom";
    functional?: boolean;
    analytics?: boolean;
    marketing?: boolean;
  } | null;
  legalDocumentId?: { docType?: string; version?: number; title?: string } | string;
  staticPageId?: { name?: string; title?: string } | string;
  event?: { name?: string } | string;
};

const CONTEXT_LABELS: Record<string, string> = {
  signup: "Sign-up",
  event_reservation: "Event reservation",
  coach_profile: "Coach profile",
  marketing: "Marketing consent",
  cookie_consent: "Cookie consent",
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
        setError(res?.message || res?.error || "Liste alınamadı");
        setItems([]);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Liste alınamadı");
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
        Kullanıcıların kabul ettiği sözleşmelerin denetim kaydı: kayıt (KVKK / şartlar),
        etkinlik kaydı (mesafeli satış / etkinlik sözleşmesi), antrenör profili,
        pazarlama izni ve çerez tercihleri.
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
            Sözleşme anahtarı
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
            Bağlam
          </label>
          <select
            value={context}
            onChange={(e) => setContext(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
          >
            <option value="">Tümü</option>
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
          Filtrele
        </button>
      </form>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
        {loading ? (
          <p className="p-8 text-center text-gray-500">Yükleniyor…</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-gray-500">Kayıt bulunamadı.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700 text-left">
                  <th className="p-3">Tarih</th>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">Sözleşme</th>
                  <th className="p-3">Sürüm</th>
                  <th className="p-3">Kaynak</th>
                  <th className="p-3">Bağlam</th>
                  <th className="p-3">Tercihler</th>
                  <th className="p-3">Etkinlik</th>
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
            Önceki
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
            Sonraki
          </button>
        </div>
      )}
    </div>
  );
}
