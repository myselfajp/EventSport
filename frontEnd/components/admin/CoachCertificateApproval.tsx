"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import UserProfileModal from "../UserProfileModal";

interface Branch {
  _id: string;
  certificateLevel?: string;
  coach: {
    _id: string;
    name: string;
    isVerified: boolean;
  };
  sport: {
    _id: string;
    name: string;
    groupName: string;
  };
  level: number;
  certificate: {
    path: string;
    originalName: string;
    mimeType: string;
    size: number;
  };
  status: string;
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    photo?: {
      path: string;
      originalName: string;
      mimeType: string;
      size: number;
    };
  };
  createdAt: string;
}

export default function CoachCertificateApproval() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Pending" | "Approved" | "Rejected">("Pending");
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchPendingBranches();
  }, [page, search, statusFilter]);

  const fetchPendingBranches = async () => {
    try {
      setLoading(true);
      setError("");
      const body: any = {
        perPage: 10,
        pageNumber: page,
        status: statusFilter,
      };
      if (search) {
        body.search = search;
      }
      const response = await fetchJSON(EP.ADMIN.coaches.pending, {
        method: "POST",
        body: body,
      });

      if (response?.success) {
        setBranches(response.data);
        setTotalPages(response.totalPages || 1);
        setTotalCount(typeof response.total === "number" ? response.total : response.data?.length ?? 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch certificates");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (branchId: string) => {
    if (!confirm("Are you sure you want to approve this certificate?")) return;

    try {
      setError("");
      const response = await fetchJSON(EP.ADMIN.coaches.approve(branchId), {
        method: "PUT",
      });

      if (response?.success) {
        fetchPendingBranches();
      }
    } catch (err: any) {
      setError(err.message || "Failed to approve certificate");
    }
  };

  const handleReject = async (branchId: string) => {
    if (!confirm("Are you sure you want to reject this certificate?")) return;

    try {
      setError("");
      const response = await fetchJSON(EP.ADMIN.coaches.reject(branchId), {
        method: "PUT",
      });

      if (response?.success) {
        if (response.revertedToGamer) {
          alert(
            "Certificate rejected. The user remains a gamer; coach application was removed."
          );
        }
        fetchPendingBranches();
      }
    } catch (err: any) {
      setError(err.message || "Failed to reject certificate");
    }
  };

  const getCertificateUrl = (path: string) => {
    if (path.startsWith("http")) return path;
    return EP.assetUrl(path);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">
          Coach Certificate Approval
        </h2>
        {!loading && totalCount > 0 && (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
            {totalCount} {statusFilter.toLowerCase()} certificate
            {totalCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="inline-flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden">
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
                  : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Coach name, sport, branch ID, or coach profile ID..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        />
      </div>

      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300 dark:border-slate-600">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Branch ID
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Coach
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Coach ID
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Sport
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Level
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Cert. class
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Certificate
                  </th>
                  <th className="border border-gray-300 dark:border-slate-600 p-2 text-left">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => (
                  <tr
                    key={branch._id}
                    className={
                      branch.status === "Approved"
                        ? "border-l-4 border-l-green-400 bg-green-50/60 dark:border-l-green-500 dark:bg-green-950/25"
                        : branch.status === "Rejected"
                        ? "border-l-4 border-l-red-400 bg-red-50/60 dark:border-l-red-500 dark:bg-red-950/25"
                        : "border-l-4 border-l-amber-400 bg-amber-50/60 dark:border-l-amber-500 dark:bg-amber-950/25"
                    }
                  >
                    <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                      <code className="font-mono select-all break-all">{branch._id}</code>
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      <div>
                        <div className="font-medium">
                          {branch.user
                            ? `${branch.user.firstName} ${branch.user.lastName}`
                            : branch.coach.name}
                        </div>
                        {branch.user && (
                          <div className="text-sm text-gray-600 dark:text-slate-400">
                            {branch.user.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2 text-xs">
                      <code className="font-mono select-all break-all">{branch.coach?._id || "—"}</code>
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {branch.sport.name} ({branch.sport.groupName})
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {branch.level}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      {branch.certificateLevel || "—"}
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      <button
                        onClick={() => setSelectedBranch(branch)}
                        className="text-cyan-600 hover:underline"
                      >
                        View Certificate
                      </button>
                    </td>
                    <td className="border border-gray-300 dark:border-slate-600 p-2">
                      <div className="mb-2">
                        <span
                          className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                            branch.status === "Approved"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                              : branch.status === "Rejected"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {branch.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {branch.user?._id ? (
                          <button
                            type="button"
                            onClick={() => setProfileUserId(branch.user!._id)}
                            className="px-3 py-1 rounded border border-cyan-600 text-cyan-700 hover:bg-cyan-50 dark:border-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                          >
                            View profile
                          </button>
                        ) : null}
                        {branch.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleApprove(branch._id)}
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(branch._id)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </>
      )}

      {selectedBranch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100">
                Certificate Preview
              </h3>
              <button
                onClick={() => setSelectedBranch(null)}
                className="text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <strong>Coach:</strong>{" "}
                {selectedBranch.user
                  ? `${selectedBranch.user.firstName} ${selectedBranch.user.lastName}`
                  : selectedBranch.coach.name}
              </div>
              <div>
                <strong>Sport:</strong> {selectedBranch.sport.name} (
                {selectedBranch.sport.groupName})
              </div>
              <div>
                <strong>Level:</strong> {selectedBranch.level}
              </div>
              <div>
                <strong>Certificate class:</strong>{" "}
                {selectedBranch.certificateLevel || "—"}
              </div>
              <div>
                <strong>File:</strong> {selectedBranch.certificate.originalName}
              </div>
              <div className="mt-4">
                {selectedBranch.certificate.mimeType.startsWith("image/") ? (
                  <img
                    src={getCertificateUrl(selectedBranch.certificate.path)}
                    alt="Certificate"
                    className="max-w-full h-auto border border-gray-300 dark:border-slate-600 rounded"
                  />
                ) : (
                  <a
                    href={getCertificateUrl(selectedBranch.certificate.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-600 hover:underline"
                  >
                    Download Certificate
                  </a>
                )}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {selectedBranch.user?._id ? (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileUserId(selectedBranch.user!._id);
                      setSelectedBranch(null);
                    }}
                    className="px-4 py-2 border border-cyan-600 text-cyan-700 rounded-lg hover:bg-cyan-50 dark:border-cyan-500 dark:text-cyan-300 dark:hover:bg-cyan-950/40"
                  >
                    View profile
                  </button>
                ) : null}
                {selectedBranch.status === "Pending" ? (
                  <>
                    <button
                      onClick={() => {
                        handleApprove(selectedBranch._id);
                        setSelectedBranch(null);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedBranch._id);
                        setSelectedBranch(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      )}

      <UserProfileModal
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
        userId={profileUserId}
        context="coach"
      />
    </div>
  );
}

