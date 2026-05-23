"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

type BlacklistEntry = {
  _id: string;
  type: "email" | "phone" | "userId";
  value: string;
  reason?: string;
  linkedUser?: { _id: string; firstName?: string; lastName?: string; email?: string } | null;
  createdBy?: { _id: string; firstName?: string; lastName?: string; email?: string };
  createdAt: string;
};

export default function BlacklistManagement() {
  const [entries, setEntries] = useState<BlacklistEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "email" as "email" | "phone" | "userId",
    value: "",
    reason: "",
  });

  const fetchEntries = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchJSON(EP.ADMIN.blacklist.list, {
        method: "POST",
        body: {
          perPage: 20,
          pageNumber: page,
          ...(search.trim() ? { search: search.trim() } : {}),
        },
      });
      if (res?.success) {
        setEntries(res.data || []);
        setTotalPages(res.totalPages || 1);
      } else {
        setError(res?.message || "Failed to load blacklist");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load blacklist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.value.trim()) {
      setError("Value is required");
      return;
    }
    try {
      const res = await fetchJSON(EP.ADMIN.blacklist.create, {
        method: "POST",
        body: {
          type: form.type,
          value: form.value.trim(),
          reason: form.reason.trim(),
        },
      });
      if (res?.success) {
        setShowForm(false);
        setForm({ type: "email", value: "", reason: "" });
        fetchEntries();
      } else {
        setError(res?.message || "Failed to add entry");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add entry");
    }
  };

  const handleRemove = async (entry: BlacklistEntry) => {
    if (!confirm(`Remove ${entry.type}: ${entry.value} from blacklist?`)) return;
    setError("");
    try {
      const res = await fetchJSON(EP.ADMIN.blacklist.remove(entry._id), {
        method: "DELETE",
      });
      if (res?.success) fetchEntries();
      else setError(res?.message || "Failed to remove");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove");
    }
  };

  const formatUser = (u?: { firstName?: string; lastName?: string; email?: string } | null) => {
    if (!u) return "—";
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ");
    return name ? `${name} (${u.email || ""})` : u.email || "—";
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      <p className="text-sm text-gray-600 dark:text-slate-400">
        Blocked emails, phones, or user IDs cannot sign in or register. Blacklisting a user from the
        Users tab also deactivates their account and adds email, phone, and user id entries.
      </p>

      <div className="flex flex-wrap gap-2 items-center justify-between">
        <input
          type="search"
          placeholder="Search value, reason, type…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-slate-100"
        />
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
        >
          Add entry
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="overflow-x-auto border border-gray-200 dark:border-slate-600 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-slate-700">
                <tr>
                  <th className="text-left p-2">Type</th>
                  <th className="text-left p-2">Value</th>
                  <th className="text-left p-2">Reason</th>
                  <th className="text-left p-2">Linked user</th>
                  <th className="text-left p-2">Added by</th>
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-gray-500">
                      No blacklist entries
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="border-t border-gray-200 dark:border-slate-600"
                    >
                      <td className="p-2 font-mono text-xs">{entry.type}</td>
                      <td className="p-2 break-all max-w-xs">{entry.value}</td>
                      <td className="p-2 text-xs">{entry.reason || "—"}</td>
                      <td className="p-2 text-xs">{formatUser(entry.linkedUser)}</td>
                      <td className="p-2 text-xs">{formatUser(entry.createdBy)}</td>
                      <td className="p-2 text-xs whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString()}
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          onClick={() => handleRemove(entry)}
                          className="text-red-600 dark:text-red-400 hover:underline text-xs"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-slate-100">
              Add blacklist entry
            </h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Type
                </label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      type: e.target.value as "email" | "phone" | "userId",
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                >
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="userId">User ID (24-char)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Value
                </label>
                <input
                  required
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  placeholder={
                    form.type === "email"
                      ? "user@example.com"
                      : form.type === "phone"
                        ? "+90 5XX XXX XX XX"
                        : "MongoDB ObjectId"
                  }
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Reason (optional)
                </label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
