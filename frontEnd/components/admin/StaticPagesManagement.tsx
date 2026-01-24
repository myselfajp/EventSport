"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import { X, Plus, Edit2, Trash2, Eye, Save, Type, Heading1, FileText } from "lucide-react";

interface StaticPage {
  _id: string;
  name: string;
  title: string;
  content: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export default function StaticPagesManagement() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formData, setFormData] = useState({ name: "", title: "", content: "", isActive: true, order: 0 });
  const [previewContent, setPreviewContent] = useState("");

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.staticPages.getAll, { method: "GET" });
      if (res?.success && Array.isArray(res?.data)) {
        setPages(res.data);
      } else {
        setError(res?.message || res?.error || "Failed to fetch pages");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch pages");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingPage(null);
    setFormData({ name: "", title: "", content: "", isActive: true, order: 0 });
    setPreviewContent("");
    setShowModal(true);
  };

  const handleEdit = (page: StaticPage) => {
    setEditingPage(page);
    setFormData({
      name: page.name,
      title: page.title,
      content: page.content,
      isActive: page.isActive,
      order: page.order,
    });
    setPreviewContent(page.content);
    setShowModal(true);
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.staticPages.delete(pageId), { method: "DELETE" });
      if (res?.success) {
        fetchPages();
      } else {
        setError(res?.message || res?.error || "Failed to delete page");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete page");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (editingPage) {
        const res = await fetchJSON(EP.ADMIN.staticPages.update(editingPage._id), {
          method: "PUT",
          body: formData,
        });
        if (res?.success) {
          setShowModal(false);
          setEditingPage(null);
          fetchPages();
        } else {
          setError(res?.message || res?.error || "Failed to update page");
        }
      } else {
        const res = await fetchJSON(EP.ADMIN.staticPages.create, {
          method: "POST",
          body: formData,
        });
        if (res?.success) {
          setShowModal(false);
          setFormData({ name: "", title: "", content: "", isActive: true, order: 0 });
          fetchPages();
        } else {
          setError(res?.message || res?.error || "Failed to create page");
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to save page");
    }
  };

  const insertTag = (tag: string) => {
    const textarea = document.getElementById("content-editor") as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const selected = text.substring(start, end);
    const after = text.substring(end);

    let insertText = "";
    if (tag === "h1") {
      insertText = `<h1>${selected || "Heading 1"}</h1>`;
    } else if (tag === "h2") {
      insertText = `<h2>${selected || "Heading 2"}</h2>`;
    } else if (tag === "h3") {
      insertText = `<h3>${selected || "Heading 3"}</h3>`;
    } else if (tag === "p") {
      insertText = `<p>${selected || "Paragraph text"}</p>`;
    }

    const newText = before + insertText + after;
    setFormData({ ...formData, content: newText });
    setPreviewContent(newText);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  useEffect(() => {
    setPreviewContent(formData.content);
  }, [formData.content]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Static Pages</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            Create and manage static pages like "About Us"
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Page
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-gray-500 dark:text-slate-400 mt-2">Loading pages...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <FileText className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-slate-400">No pages created yet</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Order
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {pages.map((page) => (
                <tr key={page._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-slate-100">
                    {page.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{page.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        page.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {page.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-slate-400">
                    {page.order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(page)}
                        className="text-cyan-600 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(page._id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {editingPage ? "Edit Page" : "Create New Page"}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingPage(null);
                  setFormData({ name: "", title: "", content: "", isActive: true, order: 0 });
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Page Name (URL slug)
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  placeholder="about-us"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                  Page Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  placeholder="About Us"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Content (HTML)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => insertTag("h1")}
                      className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-sm"
                      title="Insert H1"
                    >
                      <Heading1 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("h2")}
                      className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-sm"
                      title="Insert H2"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("h3")}
                      className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-sm"
                      title="Insert H3"
                    >
                      <Type className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => insertTag("p")}
                      className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-sm"
                      title="Insert Paragraph"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <textarea
                  id="content-editor"
                  required
                  value={formData.content}
                  onChange={(e) => {
                    setFormData({ ...formData, content: e.target.value });
                    setPreviewContent(e.target.value);
                  }}
                  rows={12}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-mono text-sm"
                  placeholder="<h1>Title</h1>&#10;<p>Your content here...</p>"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-slate-300">Active</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingPage ? "Update Page" : "Create Page"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingPage(null);
                    setFormData({ name: "", title: "", content: "", isActive: true, order: 0 });
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium transition-colors"
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
