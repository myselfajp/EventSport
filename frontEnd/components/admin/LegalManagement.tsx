"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import LegalContentModal from "../auth/LegalContentModal";

interface LegalDocument {
  _id: string;
  docType: "kvkk" | "terms";
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type DocTypeFilter = "kvkk" | "terms" | "all";

export default function LegalManagement() {
  const [filter, setFilter] = useState<DocTypeFilter>("all");
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [viewModal, setViewModal] = useState<{ title: string; content: string } | null>(null);
  const [formData, setFormData] = useState({ docType: "kvkk" as "kvkk" | "terms", title: "", content: "" });

  useEffect(() => {
    fetchDocs();
  }, [filter]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError("");
      const url = filter === "all" ? EP.ADMIN.legal.list() : EP.ADMIN.legal.list(filter);
      const res = await fetchJSON(url, { method: "GET" });
      if (res?.success && Array.isArray(res?.data)) {
        setDocs(res.data);
      } else {
        setError(res?.message || res?.error || "Failed to fetch documents");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch documents");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingDoc(null);
    const docType = filter === "terms" ? "terms" : filter === "kvkk" ? "kvkk" : "kvkk";
    setFormData({
      docType,
      title: docType === "terms" ? "Terms & Conditions" : "KVKK",
      content: "",
    });
    setShowModal(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setEditingDoc(doc);
    setFormData({ docType: doc.docType, title: doc.title, content: doc.content });
    setShowModal(true);
  };

  const handleView = (doc: LegalDocument) => {
    setViewModal({ title: doc.title, content: doc.content });
  };

  const handleSetActive = async (doc: LegalDocument) => {
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.legal.activate(doc._id), { method: "PUT" });
      if (res?.success) {
        fetchDocs();
      } else {
        setError(res?.message || res?.error || "Failed to set active");
      }
    } catch (err: any) {
      setError(err.message || "Failed to set active");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (editingDoc) {
        const res = await fetchJSON(EP.ADMIN.legal.update(editingDoc._id), {
          method: "PUT",
          body: { title: formData.title, content: formData.content },
        });
        if (res?.success) {
          setShowModal(false);
          setEditingDoc(null);
          fetchDocs();
        } else {
          setError(res?.message || res?.error || "Failed to update");
        }
      } else {
        const res = await fetchJSON(EP.ADMIN.legal.create, {
          method: "POST",
          body: {
            docType: formData.docType,
            title: formData.title,
            content: formData.content,
            isActive: false,
          },
        });
        if (res?.success) {
          setShowModal(false);
          fetchDocs();
        } else {
          setError(res?.message || res?.error || "Failed to create");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save");
    }
  };

  const filtered = docs.filter((d) => filter === "all" || d.docType === filter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "all"
                ? "bg-cyan-600 text-white"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter("kvkk")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "kvkk"
                ? "bg-cyan-600 text-white"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            KVKK
          </button>
          <button
            type="button"
            onClick={() => setFilter("terms")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              filter === "terms"
                ? "bg-cyan-600 text-white"
                : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
            }`}
          >
            Terms & Conditions
          </button>
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
        >
          Create New Version
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="border border-gray-300 dark:border-slate-600 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            No documents. Create a new version.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Type
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Version
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Title
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Active
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm text-gray-900 dark:text-slate-100">
                      {doc.docType === "kvkk" ? "KVKK" : "Terms & Conditions"}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      v{doc.version}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm text-gray-900 dark:text-slate-100">
                      {doc.title}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      {doc.isActive ? (
                        <span className="text-green-600 dark:text-green-400 font-medium">Active</span>
                      ) : (
                        <span className="text-gray-500 dark:text-slate-400">—</span>
                      )}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleView(doc)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(doc)}
                          className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm"
                        >
                          Edit
                        </button>
                        {!doc.isActive && (
                          <button
                            type="button"
                            onClick={() => handleSetActive(doc)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            Set Active
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <h3 className="text-xl font-bold px-6 py-4 border-b border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100">
              {editingDoc ? "Edit Document" : "Create New Version"}
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {!editingDoc && (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                      Type
                    </label>
                    <select
                      value={formData.docType}
                      onChange={(e) =>
                        setFormData({ ...formData, docType: e.target.value as "kvkk" | "terms" })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      <option value="kvkk">KVKK</option>
                      <option value="terms">Terms & Conditions</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                    Content
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-y"
                    placeholder="Plain text content..."
                  />
                </div>
              </div>
              <div className="flex gap-2 p-6 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  {editingDoc ? "Update" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDoc(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewModal && (
        <LegalContentModal
          title={viewModal.title}
          content={viewModal.content}
          onClose={() => setViewModal(null)}
        />
      )}
    </div>
  );
}
