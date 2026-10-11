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
} from "lucide-react";

type DocTypeFilter = LegalDocType | "all";

interface LegalDocument {
  _id: string;
  docType: LegalDocType;
  version: number;
  title: string;
  content: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type LegalManagementProps = {
  category: ContractCategory;
  allowedDocTypes: readonly LegalDocType[];
};

function docTypeFromFilter(
  f: DocTypeFilter,
  allowed: readonly LegalDocType[]
): LegalDocType {
  if (f === "all") return allowed[0];
  return f;
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
    docType: "kvkk" as LegalDocType,
    title: "",
    content: "",
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
      const url =
        filter === "all"
          ? EP.ADMIN.legal.list(undefined, category)
          : EP.ADMIN.legal.list(filter);
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
    const docType = docTypeFromFilter(filter, allowedDocTypes);
    const initialTitle = DEFAULT_TITLES[docType] || "";
    setFormData({
      docType,
      title: initialTitle,
      content: "",
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
    setFormData({ docType: doc.docType, title: doc.title, content: doc.content });
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
            content: contentToSubmit,
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

  const filtered = docs
    .filter((d) => allowedDocTypes.includes(d.docType))
    .filter((d) => filter === "all" || d.docType === filter);

  const filterButtons: { key: DocTypeFilter; label: string }[] = [
    { key: "all", label: "All" },
    ...allowedDocTypes.map((dt) => ({
      key: dt as DocTypeFilter,
      label: DOC_TYPE_LABELS[dt],
    })),
  ];

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {CATEGORY_LABELS[category]} — only the <strong>active</strong> version is shown on the site and during registration.
        Individual URL:{" "}
        {allowedDocTypes.map((dt) => (
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
                      {DOC_TYPE_LABELS[doc.docType]}
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
        <div className="fixed inset-0 bg-black/60 dark:bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-slate-700 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-slate-100 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                  {editingDoc ? `Edit ${DOC_TYPE_LABELS[formData.docType] || "Document"}` : "Create New Document Version"}
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
                  <div>
                    <label className="block text-sm font-semibold mb-1 text-gray-700 dark:text-slate-300">
                      Contract Type
                    </label>
                    <select
                      value={formData.docType}
                      onChange={(e) => {
                        const docType = e.target.value as LegalDocType;
                        setFormData({
                          docType,
                          title: DEFAULT_TITLES[docType],
                          content: formData.content,
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                    >
                      {allowedDocTypes.map((dt) => (
                        <option key={dt} value={dt}>
                          {DOC_TYPE_LABELS[dt]}
                        </option>
                      ))}
                    </select>
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
                    placeholder="e.g. Mesafeli Satış Sözleşmesi (Koç)"
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

              <div className="flex gap-3 px-6 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-sm transition-colors"
                >
                  {editingDoc ? "Save Changes" : "Create New Version"}
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
