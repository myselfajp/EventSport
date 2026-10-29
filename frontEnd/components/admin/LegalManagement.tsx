"use client";

import { useState, useEffect } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import LegalContentModal from "../auth/LegalContentModal";
import {
  CATEGORY_LABELS,
  DEFAULT_TITLES,
  DOC_TYPE_LABELS,
  type ContractCategory,
  type LegalDocType,
} from "@/app/lib/contract-documents";
import {
  LegalArticle,
  parseHtmlToArticles,
  compileArticlesToHtml,
} from "@/app/lib/legal-editor-parser";
import {
  Sparkles,
  Code,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  FileText,
  PlusCircle,
} from "lucide-react";

// We keep allowedDocTypes as LegalDocType[] for predefined ones,
// but the component also discovers and shows any custom docTypes from the API.
type DocTypeFilter = string; // "all" | any docType string

interface LegalDocument {
  _id: string;
  docType: string;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

type LegalManagementProps = {
  category: ContractCategory;
  allowedDocTypes: readonly LegalDocType[];
};

/** Get a display label for any docType (predefined or custom) */
function getDocTypeLabel(docType: string): string {
  return (DOC_TYPE_LABELS as Record<string, string>)[docType] || docType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function LegalManagement({
  category,
  allowedDocTypes,
}: LegalManagementProps) {
  const [filter, setFilter] = useState<DocTypeFilter>("all");
  const [docs, setDocs] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocument | null>(null);
  const [viewModal, setViewModal] = useState<{ title: string; content: string } | null>(null);
  const [formData, setFormData] = useState({
    docType: allowedDocTypes[0] as string,
    customDocType: "",
    isCustomType: false,
    title: "",
    content: "",
    category: category as string,
  });

  const [editorMode, setEditorMode] = useState<"visual" | "code">("visual");
  const [visualSubtitle, setVisualSubtitle] = useState("");
  const [visualArticles, setVisualArticles] = useState<LegalArticle[]>([]);
  const [visualFooter, setVisualFooter] = useState("");

  useEffect(() => {
    fetchDocs();
  }, [filter]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      setError("");
      // Always fetch by category so we get ALL docs (including custom ones)
      const url = EP.ADMIN.legal.list(undefined, category);
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

  // All docTypes present in fetched docs
  const allDocTypesInDocs = Array.from(new Set(docs.map((d) => d.docType)));

  // Merge predefined + discovered custom types for filter buttons
  const allKnownDocTypes = Array.from(
    new Set([...allowedDocTypes, ...allDocTypesInDocs])
  );

  const handleCreate = () => {
    setEditingDoc(null);
    const firstType = allowedDocTypes[0] as string;
    setFormData({
      docType: firstType,
      customDocType: "",
      isCustomType: false,
      title: (DEFAULT_TITLES as Record<string, string>)[firstType] || "",
      content: "",
      category,
    });
    setVisualSubtitle("");
    setVisualArticles([
      {
        id: "art-1",
        heading: "MADDE 1 – TARAFLAR",
        content: "",
      },
    ]);
    setVisualFooter("");
    setEditorMode("visual");
    setShowModal(true);
  };

  const handleEdit = (doc: LegalDocument) => {
    setEditingDoc(doc);
    setFormData({
      docType: doc.docType,
      customDocType: "",
      isCustomType: false,
      title: doc.title,
      content: doc.content,
      category: doc.category || category,
    });
    const parsed = parseHtmlToArticles(doc.content);
    setVisualSubtitle(parsed.subtitle);
    setVisualArticles(parsed.articles);
    setVisualFooter(parsed.footer);
    setEditorMode("visual");
    setShowModal(true);
  };

  const switchToCode = () => {
    const compiled = compileArticlesToHtml({
      title: formData.title,
      subtitle: visualSubtitle,
      articles: visualArticles,
      footer: visualFooter,
    });
    setFormData((prev) => ({ ...prev, content: compiled }));
    setEditorMode("code");
  };

  const switchToVisual = () => {
    const parsed = parseHtmlToArticles(formData.content);
    setVisualSubtitle(parsed.subtitle);
    setVisualArticles(parsed.articles);
    setVisualFooter(parsed.footer);
    setEditorMode("visual");
  };

  const addArticle = () => {
    setVisualArticles((prev) => [
      ...prev,
      {
        id: `art-${Date.now()}`,
        heading: `MADDE ${prev.length + 1} – `,
        content: "",
      },
    ]);
  };

  const removeArticle = (index: number) => {
    setVisualArticles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveArticle = (index: number, direction: "up" | "down") => {
    setVisualArticles((prev) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[targetIndex];
      copy[targetIndex] = temp;
      return copy;
    });
  };

  const updateArticle = (index: number, field: "heading" | "content", val: string) => {
    setVisualArticles((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
  };

  const insertPlaceholderToArticle = (index: number, tag: string) => {
    setVisualArticles((prev) => {
      const copy = [...prev];
      const existing = copy[index].content;
      copy[index] = {
        ...copy[index],
        content: existing ? `${existing} ${tag}` : tag,
      };
      return copy;
    });
  };

  const handleView = (doc: LegalDocument) => {
    setViewModal({ title: doc.title, content: doc.content });
  };

  const handleToggleActive = async (doc: LegalDocument, targetStatus?: boolean) => {
    try {
      setError("");
      const nextActive = targetStatus !== undefined ? targetStatus : !doc.isActive;
      const res = await fetchJSON(EP.ADMIN.legal.activate(doc._id), {
        method: "PUT",
        body: { isActive: nextActive },
      });
      if (res?.success) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("eventsport:contracts-updated"));
        }
        fetchDocs();
      } else {
        setError(res?.message || res?.error || "Failed to update status");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError("");

      // Resolve the final docType (predefined or custom)
      const resolvedDocType = formData.isCustomType
        ? formData.customDocType.trim()
        : formData.docType;

      if (formData.isCustomType && !resolvedDocType) {
        setError("Please enter a contract type key.");
        return;
      }

      const contentToSubmit =
        editorMode === "visual"
          ? compileArticlesToHtml({
              title: formData.title,
              subtitle: visualSubtitle,
              articles: visualArticles,
              footer: visualFooter,
            })
          : formData.content;

      if (editingDoc) {
        const res = await fetchJSON(EP.ADMIN.legal.update(editingDoc._id), {
          method: "PUT",
          body: { title: formData.title, content: contentToSubmit },
        });
        if (res?.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("eventsport:contracts-updated"));
          }
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
            docType: resolvedDocType,
            title: formData.title,
            content: contentToSubmit,
            isActive: false,
            category: formData.category,
          },
        });
        if (res?.success) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("eventsport:contracts-updated"));
          }
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

  // Filtered documents for the table
  const filtered = filter === "all"
    ? docs
    : docs.filter((d) => d.docType === filter);

  const filterButtons: { key: DocTypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...allKnownDocTypes.map((dt) => ({
      key: dt as DocTypeFilter,
      label: getDocTypeLabel(dt),
    })),
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {CATEGORY_LABELS[category]} — only the <strong>active</strong> version is shown on the site and during registration.
        Individual URL:{" "}
        {allKnownDocTypes.map((dt) => (
          <code
            key={dt}
            className="bg-gray-100 dark:bg-slate-800 px-1 rounded text-[11px] mr-1"
          >
            /legal/{dt}
          </code>
        ))}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2 flex-wrap">
          {filterButtons.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                filter === key
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          Create Document
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
            No documents. Create a new document.
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
                      <div className="font-medium">{getDocTypeLabel(doc.docType)}</div>
                      <div className="text-xs text-gray-400 dark:text-slate-500 font-mono mt-0.5">{doc.docType}</div>
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      v{doc.version}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm text-gray-900 dark:text-slate-100">
                      {doc.title}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      {doc.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400 border border-gray-300 dark:border-slate-600">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3">
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleView(doc)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm font-medium transition-colors"
                        >
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(doc)}
                          className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm font-medium transition-colors"
                        >
                          Edit
                        </button>
                        {doc.isActive ? (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(doc, false)}
                            className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium transition-colors"
                            title="Deactivate this contract so it will not appear on the website"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleActive(doc, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors"
                            title="Activate this contract version on the website"
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
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  {editingDoc ? `Edit ${getDocTypeLabel(formData.docType)}` : "Create Document"}
                </h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  {editorMode === "visual"
                    ? "Visual Clause Editor: Edit headings and clauses cleanly without raw HTML tags."
                    : "Raw HTML Mode: Directly modify underlying HTML code."}
                </p>
              </div>

              {/* Mode Toggle Switch */}
              <div className="flex bg-gray-200 dark:bg-slate-700 rounded-lg p-1 text-xs font-medium">
                <button
                  type="button"
                  onClick={switchToVisual}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    editorMode === "visual"
                      ? "bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-semibold"
                      : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  Visual Editor
                </button>
                <button
                  type="button"
                  onClick={switchToCode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                    editorMode === "code"
                      ? "bg-white dark:bg-slate-800 text-cyan-700 dark:text-cyan-300 shadow-sm font-semibold"
                      : "text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  <Code className="w-3.5 h-3.5" />
                  Raw HTML
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {!editingDoc && (
                  <div className="space-y-3">
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-slate-300">
                      Contract Type
                    </label>

                    {/* Toggle: predefined or new custom type */}
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isCustomType: false }))}
                        className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          !formData.isCustomType
                            ? "bg-cyan-600 text-white"
                            : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                        }`}
                      >
                        Select existing type
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, isCustomType: true, customDocType: "" }))}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                          formData.isCustomType
                            ? "bg-cyan-600 text-white"
                            : "bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-300 dark:hover:bg-slate-600"
                        }`}
                      >
                        <Plus className="w-3 h-3" />
                        Create new type
                      </button>
                    </div>

                    {!formData.isCustomType ? (
                      <select
                        value={formData.docType}
                        onChange={(e) => {
                          const docType = e.target.value;
                          setFormData({
                            ...formData,
                            docType,
                            title: (DEFAULT_TITLES as Record<string, string>)[docType] || "",
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                      >
                        {allowedDocTypes.map((dt) => (
                          <option key={dt} value={dt}>
                            {getDocTypeLabel(dt)}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-700 dark:text-amber-300">
                          <strong>New contract type:</strong> Enter a unique key (e.g. <code>liability_waiver</code>).
                          Use lowercase letters, numbers and underscores only. This type will appear in the{" "}
                          <strong>{CATEGORY_LABELS[category]}</strong> section on the public Agreements page once activated.
                        </div>
                        <input
                          type="text"
                          required={formData.isCustomType}
                          value={formData.customDocType}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              customDocType: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "_"),
                            }))
                          }
                          placeholder="e.g. liability_waiver"
                          className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-mono text-sm"
                        />
                        <p className="text-[11px] text-gray-400 dark:text-slate-500">
                          Key preview: <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">/legal/{formData.customDocType || "your_key"}</code>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-slate-300">
                    Document Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Liability Waiver Agreement"
                    className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 font-medium"
                  />
                </div>

                {editorMode === "visual" ? (
                  <div className="space-y-6">
                    {/* Subtitle / Header Note */}
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-slate-300">
                        Subtitle / Description <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <input
                        type="text"
                        value={visualSubtitle}
                        onChange={(e) => setVisualSubtitle(e.target.value)}
                        placeholder="e.g. 6502 Sayılı Tüketicinin Korunması Hakkında Kanun Uyarınca Düzenlenmiştir"
                        className="w-full px-3.5 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
                      />
                    </div>

                    {/* Articles Section */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                            Articles & Clauses ({visualArticles.length})
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-slate-400">
                            Each article contains a title and plain paragraphs. No HTML tags needed.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={addArticle}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg shadow-sm transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Article
                        </button>
                      </div>

                      <div className="space-y-4">
                        {visualArticles.map((article, idx) => (
                          <div
                            key={article.id || `art-${idx}`}
                            className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-900/40 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-900/60 text-cyan-800 dark:text-cyan-200 font-bold text-xs shrink-0">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={article.heading}
                                  onChange={(e) =>
                                    updateArticle(idx, "heading", e.target.value)
                                  }
                                  placeholder={`MADDE ${idx + 1} – BAŞLIK`}
                                  className="w-full px-3 py-1.5 text-sm font-semibold border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                                />
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => moveArticle(idx, "up")}
                                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30"
                                  title="Move Up"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === visualArticles.length - 1}
                                  onClick={() => moveArticle(idx, "down")}
                                  className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400 disabled:opacity-30"
                                  title="Move Down"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={visualArticles.length <= 1}
                                  onClick={() => removeArticle(idx)}
                                  className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 disabled:opacity-30"
                                  title="Delete Article"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div>
                              <textarea
                                value={article.content}
                                onChange={(e) =>
                                  updateArticle(idx, "content", e.target.value)
                                }
                                rows={5}
                                placeholder="Type the clause text here. Use normal paragraphs and line breaks..."
                                className="w-full px-3.5 py-2.5 text-sm leading-relaxed border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y"
                              />
                            </div>

                            {/* Dynamic Placeholder Insertion Chips for this article */}
                            <div className="pt-1">
                              <span className="text-[11px] font-medium text-gray-500 dark:text-slate-400 block mb-1">
                                Insert details into this clause:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {[
                                  { tag: "{{ALICI_AD_SOYAD}}", label: "Buyer Name" },
                                  { tag: "{{ALICI_EPOSTA}}", label: "Email" },
                                  { tag: "{{ALICI_TELEFON}}", label: "Phone" },
                                  { tag: "{{ALICI_KONUM}}", label: "Location" },
                                  { tag: "{{KOC_BRANS}}", label: "Branch" },
                                  { tag: "{{PLAN_ADI}}", label: "Plan Name" },
                                  { tag: "{{ETKINLIK_ADI}}", label: "Event Name" },
                                  { tag: "{{UCRET}}", label: "Fee / Price" },
                                  { tag: "{{TARIH}}", label: "Sign Date" },
                                ].map(({ tag, label }) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => insertPlaceholderToArticle(idx, tag)}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 rounded border border-cyan-200 dark:border-cyan-800 text-[10px] hover:bg-cyan-100 transition-colors"
                                    title={`Insert ${tag}`}
                                  >
                                    <code>{tag}</code>
                                    <span className="text-[9px] text-gray-500 dark:text-slate-400">({label})</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={addArticle}
                        className="mt-3 w-full py-2.5 border-2 border-dashed border-gray-300 dark:border-slate-700 hover:border-cyan-500 rounded-xl text-sm font-semibold text-gray-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 flex items-center justify-center gap-2 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Another Article / Clause
                      </button>
                    </div>

                    {/* Footer Notice */}
                    <div>
                      <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-slate-300">
                        Footer Note / Acceptance Notice <span className="text-xs font-normal text-gray-500">(Optional)</span>
                      </label>
                      <textarea
                        value={visualFooter}
                        onChange={(e) => setVisualFooter(e.target.value)}
                        rows={2}
                        placeholder="e.g. ALICI, platform üzerinden ilgili kutucuğu onaylayarak işbu sözleşmenin tüm maddelerini okuduğunu, anladığını ve elektronik ortamda kabul ettiğini beyan etmiştir."
                        className="w-full px-3.5 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-y"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-slate-300">
                      Raw HTML Content
                    </label>
                    <textarea
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      rows={14}
                      className="w-full px-3 py-2 font-mono text-xs border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 resize-y"
                      placeholder="HTML code…"
                    />
                    <div className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                      <span className="font-semibold block mb-1">
                        Dynamic Placeholders:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {[
                          { tag: "{{ALICI_AD_SOYAD}}", label: "Buyer Full Name" },
                          { tag: "{{ALICI_EPOSTA}}", label: "Buyer Email" },
                          { tag: "{{ALICI_TELEFON}}", label: "Buyer Phone" },
                          { tag: "{{ALICI_KONUM}}", label: "Buyer Location" },
                          { tag: "{{KOC_BRANS}}", label: "Coach Branch" },
                          { tag: "{{PLAN_ADI}}", label: "Plan Name" },
                          { tag: "{{ETKINLIK_ADI}}", label: "Event Name" },
                          { tag: "{{UCRET}}", label: "Event Fee" },
                          { tag: "{{TARIH}}", label: "Sign Date" },
                        ].map(({ tag, label }) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                content: prev.content + " " + tag,
                              }))
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 rounded border border-cyan-200 dark:border-cyan-800 text-[11px] hover:bg-cyan-100"
                            title={`Insert ${tag} (${label})`}
                          >
                            <code>{tag}</code>
                            <span className="text-[10px] text-gray-500 dark:text-slate-400">
                              ({label})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="px-6 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {editingDoc ? "Save Changes" : "Create Document"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDoc(null);
                  }}
                  className="px-6 py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 font-semibold rounded-lg transition-colors"
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
