"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { MessageSquare } from "lucide-react";

type Row = {
  _id: string;
  message: string;
  email?: string;
  contactName?: string;
  createdAt: string;
};

export default function SuggestionsManagement() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJSON(EP.ADMIN.suggestions, { method: "GET" });
        if (res?.success && Array.isArray(res?.data)) {
          setRows(res.data);
        } else {
          setError(res?.message || res?.error || "Could not load.");
        }
      } catch (e: any) {
        setError(e?.message || "Could not load.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100 mb-2 flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-cyan-500" />
        Suggestion box
      </h2>
      <p className="text-sm text-gray-600 dark:text-slate-400 mb-6">
        Messages sent via the &quot;Feedback form&quot; link in the homepage footer.
      </p>

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-cyan-500" />
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <p className="text-gray-500 dark:text-slate-400 text-sm">No suggestions yet.</p>
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/80">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Date
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Name / Email
                </th>
                <th className="text-left px-3 py-2 font-medium text-gray-700 dark:text-slate-300">
                  Message
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {rows.map((r) => (
                <tr key={r._id} className="bg-white dark:bg-slate-900/40">
                  <td className="px-3 py-3 align-top text-gray-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("en-US")}
                  </td>
                  <td className="px-3 py-3 align-top text-gray-800 dark:text-slate-200 max-w-[200px]">
                    <div className="font-medium">{r.contactName || "—"}</div>
                    <div className="text-xs text-gray-500 break-all">
                      {r.email || "—"}
                    </div>
                  </td>
                  <td className="px-3 py-3 align-top text-gray-800 dark:text-slate-200 max-w-xl whitespace-pre-wrap">
                    {r.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
