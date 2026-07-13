"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

type PerformanceApplication = {
  _id: string;
  name: string;
  branch: string;
  title?: string;
  about?: string;
  status: "Pending" | "Approved" | "Rejected";
  certificate?: {
    path: string;
    originalName: string;
  };
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
};

const BRANCH_LABEL: Record<string, string> = {
  manager: "Manager",
  psychologist: "Psychologist",
  dietitian: "Dietitian",
  psychotherapist: "Psychotherapist",
};

export default function PerformanceTeamApproval() {
  const [applications, setApplications] = useState<PerformanceApplication[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "Approved" | "Rejected">("Pending");

  useEffect(() => {
    void fetchApplications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, statusFilter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetchJSON(EP.ADMIN.performance.applications, {
        method: "POST",
        body: {
          perPage: 10,
          pageNumber: page,
          status: statusFilter,
          ...(search ? { search } : {}),
        },
      });
      if (response?.success) {
        setApplications(response.data || []);
        setTotalPages(response.totalPages || 1);
        setTotalCount(typeof response.total === "number" ? response.total : response.data?.length ?? 0);
      } else {
        setError(response?.message || "Performance applications could not be loaded.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Performance applications could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const approve = async (applicationId: string) => {
    if (!confirm("Approve this Performance Team application?")) return;
    const response = await fetchJSON(EP.ADMIN.performance.approve(applicationId), {
      method: "PUT",
    });
    if (response?.success) {
      await fetchApplications();
    } else {
      setError(response?.message || "Application could not be approved.");
    }
  };

  const reject = async (applicationId: string) => {
    const reason = prompt("Reject reason (optional):") || "";
    const response = await fetchJSON(EP.ADMIN.performance.reject(applicationId), {
      method: "PUT",
      body: { reason },
    });
    if (response?.success) {
      await fetchApplications();
    } else {
      setError(response?.message || "Application could not be rejected.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Performance Team Approval
        </h2>
        {!loading && totalCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            {totalCount} {statusFilter.toLowerCase()} application
            {totalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300 dark:border-slate-600">
          {(["Pending", "Approved", "Rejected"] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={`px-3 py-2 text-sm ${
                statusFilter === status
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-gray-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Name, email, branch, application ID..."
          className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
        />
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 p-4 text-red-700 dark:bg-red-900 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-slate-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="border border-gray-300 p-2 text-left dark:border-slate-600">Applicant</th>
                  <th className="border border-gray-300 p-2 text-left dark:border-slate-600">Branch</th>
                  <th className="border border-gray-300 p-2 text-left dark:border-slate-600">Title</th>
                  <th className="border border-gray-300 p-2 text-left dark:border-slate-600">Certificate</th>
                  <th className="border border-gray-300 p-2 text-left dark:border-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application._id}>
                    <td className="border border-gray-300 p-2 dark:border-slate-600">
                      <div className="font-medium">
                        {application.user
                          ? `${application.user.firstName} ${application.user.lastName}`
                          : application.name}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-400">
                        {application.user?.email}
                      </div>
                      <code className="text-xs">{application._id}</code>
                    </td>
                    <td className="border border-gray-300 p-2 dark:border-slate-600">
                      {BRANCH_LABEL[application.branch] || application.branch}
                    </td>
                    <td className="border border-gray-300 p-2 dark:border-slate-600">
                      {application.title || "-"}
                    </td>
                    <td className="border border-gray-300 p-2 dark:border-slate-600">
                      {application.certificate?.path ? (
                        <a
                          href={EP.assetUrl(application.certificate.path)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyan-600 underline"
                        >
                          View
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="border border-gray-300 p-2 dark:border-slate-600">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => approve(application._id)}
                          disabled={application.status === "Approved"}
                          className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => reject(application._id)}
                          disabled={application.status === "Rejected"}
                          className="rounded bg-red-600 px-3 py-1 text-sm text-white disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={5} className="border border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-slate-600">
                      No applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded bg-gray-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-slate-700"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600 dark:text-slate-400">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded bg-gray-200 px-4 py-2 text-sm disabled:opacity-50 dark:bg-slate-700"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
