"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import {
  FOOTER_SITE_PAGE_TEMPLATES,
  FOOTER_SLUG_SET,
  isValidPageSlug,
  normalizePageSlug,
  publicPagePath,
  suggestSlugFromTitle,
  type SitePageTemplate,
} from "../../app/lib/site-page-templates";
import {
  X,
  Plus,
  Edit2,
  Trash2,
  Save,
  Type,
  Heading1,
  FileText,
  ExternalLink,
  CheckCircle2,
  Circle,
  Info,
  FileWarning,
  Sparkles,
} from "lucide-react";

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

const EMPTY_FORM = {
  name: "",
  title: "",
  content: "",
  isActive: true,
  order: 0,
};

export default function StaticPagesManagement() {
  const [pages, setPages] = useState<StaticPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingPage, setEditingPage] = useState<StaticPage | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const slugTouchedRef = useRef(false);

  const pagesBySlug = useMemo(() => {
    const map = new Map<string, StaticPage>();
    for (const p of pages) {
      map.set(p.name, p);
    }
    return map;
  }, [pages]);

  const slugValid = formData.name ? isValidPageSlug(formData.name) : false;
  const slugIsFooter = formData.name ? FOOTER_SLUG_SET.has(formData.name) : false;

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch pages");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = (template?: SitePageTemplate) => {
    setEditingPage(null);
    slugTouchedRef.current = false;
    if (template) {
      setFormData({
        name: template.slug,
        title: template.title,
        content: template.content,
        isActive: true,
        order: template.order,
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setShowModal(true);
  };

  const handleEdit = (page: StaticPage) => {
    setEditingPage(page);
    slugTouchedRef.current = true;
    setFormData({
      name: page.name,
      title: page.title,
      content: page.content,
      isActive: page.isActive,
      order: page.order,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPage(null);
    setFormData(EMPTY_FORM);
    slugTouchedRef.current = false;
  };

  const handleTitleChange = (title: string) => {
    setFormData((prev) => {
      const next = { ...prev, title };
      if (!editingPage && !slugTouchedRef.current) {
        next.name = suggestSlugFromTitle(title);
      }
      return next;
    });
  };

  const handleSlugChange = (raw: string) => {
    slugTouchedRef.current = true;
    setFormData((prev) => ({ ...prev, name: normalizePageSlug(raw) }));
  };

  const handleDelete = async (pageId: string) => {
    if (!confirm("Delete this page? This cannot be undone.")) return;
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.staticPages.delete(pageId), {
        method: "DELETE",
      });
      if (res?.success) fetchPages();
      else setError(res?.message || res?.error || "Failed to delete page");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete page");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = normalizePageSlug(formData.name);
    if (!isValidPageSlug(name)) {
      setError("URL slug must be 1–80 characters: lowercase letters, numbers, and hyphens only.");
      return;
    }
    const body = { ...formData, name };

    try {
      setError("");
      if (editingPage) {
        const res = await fetchJSON(EP.ADMIN.staticPages.update(editingPage._id), {
          method: "PUT",
          body,
        });
        if (res?.success) {
          closeModal();
          fetchPages();
        } else {
          setError(res?.message || res?.error || "Failed to update page");
        }
      } else {
        const res = await fetchJSON(EP.ADMIN.staticPages.create, {
          method: "POST",
          body,
        });
        if (res?.success) {
          closeModal();
          fetchPages();
        } else {
          setError(res?.message || res?.error || "Failed to create page");
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save page");
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
    if (tag === "h1") insertText = `<h1>${selected || "Heading 1"}</h1>`;
    else if (tag === "h2") insertText = `<h2>${selected || "Heading 2"}</h2>`;
    else if (tag === "h3") insertText = `<h3>${selected || "Heading 3"}</h3>`;
    else if (tag === "p") insertText = `<p>${selected || "Paragraph text"}</p>`;

    const newText = before + insertText + after;
    setFormData((prev) => ({ ...prev, content: newText }));

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const missingFooterPages = FOOTER_SITE_PAGE_TEMPLATES.filter(
    (t) => !pagesBySlug.has(t.slug)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-slate-100">Site pages</h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-2xl">
            Informational pages (About, FAQ, Contact, policies). Legal contracts are managed under{" "}
            <span className="font-medium text-gray-700 dark:text-slate-300">Admin → Contracts</span>.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create page
        </button>
      </div>

      {/* Info panels */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-cyan-200 dark:border-cyan-900/50 bg-cyan-50/80 dark:bg-cyan-950/30 p-4">
          <div className="flex gap-3">
            <Info className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-sm text-cyan-900 dark:text-cyan-100 space-y-1">
              <p className="font-medium">How it works</p>
              <ul className="list-disc list-inside text-cyan-800/90 dark:text-cyan-200/90 space-y-0.5 text-xs">
                <li>
                  <strong>URL slug</strong> becomes{" "}
                  <code className="bg-white/60 dark:bg-slate-900/50 px-1 rounded">/sayfa/[slug]</code>
                </li>
                <li>Typing a title auto-fills the slug (e.g. &quot;About&quot; → <code>about</code>, not <code>about-us</code>)</li>
                <li>Use the quick-start buttons below for footer-linked pages</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/80 dark:bg-amber-950/20 p-4">
          <div className="flex gap-3">
            <FileWarning className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-900 dark:text-amber-100">
              Do not create contract pages here. Old contract URLs redirect to{" "}
              <Link href="/sozlesmeler" className="underline font-medium" target="_blank">
                /sozlesmeler
              </Link>
              . Edit contracts in <strong>Contracts</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Footer checklist */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Footer pages checklist
          </h3>
          {missingFooterPages.length > 0 && (
            <span className="text-xs text-amber-700 dark:text-amber-300">
              {missingFooterPages.length} missing
            </span>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FOOTER_SITE_PAGE_TEMPLATES.map((template) => {
            const existing = pagesBySlug.get(template.slug);
            return (
              <div
                key={template.slug}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm ${
                  existing
                    ? "border-green-200 dark:border-green-900/50 bg-green-50/50 dark:bg-green-950/20"
                    : "border-gray-200 dark:border-slate-600 bg-gray-50/50 dark:bg-slate-900/30"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  {existing ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-gray-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                      {template.footerLabel}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-mono truncate">
                      {template.slug}
                    </p>
                  </div>
                </div>
                {existing ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={publicPagePath(template.slug)}
                      target="_blank"
                      className="p-1 text-cyan-600 hover:text-cyan-800 dark:text-cyan-400"
                      title="View on site"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleEdit(existing)}
                      className="text-xs text-cyan-600 dark:text-cyan-400 hover:underline"
                    >
                      Edit
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCreate(template)}
                    className="text-xs font-medium text-cyan-600 dark:text-cyan-400 hover:underline shrink-0"
                  >
                    Create
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">
          Footer shows About, FAQ, Feedback, and Contact only. Legal texts are under{" "}
          <strong>Contracts</strong> and <code className="px-1 rounded bg-gray-100 dark:bg-slate-700">/sozlesmeler</code>.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto" />
          <p className="text-gray-500 dark:text-slate-400 mt-2">Loading pages…</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-slate-800 rounded-xl border border-dashed border-gray-300 dark:border-slate-600">
          <FileText className="w-12 h-12 text-gray-400 dark:text-slate-500 mx-auto mb-4" />
          <p className="text-gray-700 dark:text-slate-300 font-medium">No pages yet</p>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 mb-6 max-w-md mx-auto">
            Start with the footer pages below so site links work out of the box.
          </p>
          <div className="flex flex-wrap justify-center gap-2 px-4">
            {FOOTER_SITE_PAGE_TEMPLATES.map((t) => (
              <button
                key={t.slug}
                type="button"
                onClick={() => openCreate(t)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-cyan-300 dark:border-cyan-700 text-cyan-700 dark:text-cyan-300 hover:bg-cyan-50 dark:hover:bg-cyan-950/40 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {t.footerLabel}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Footer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {pages.map((page) => (
                <tr key={page._id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm text-gray-900 dark:text-slate-100">{page.name}</code>
                    <p className="text-xs text-gray-400 mt-0.5">{publicPagePath(page.name)}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">
                    {page.title}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {FOOTER_SLUG_SET.has(page.name) ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                        Footer
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
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
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      {page.isActive && isValidPageSlug(page.name) && (
                        <Link
                          href={publicPagePath(page.name)}
                          target="_blank"
                          className="p-1.5 text-gray-500 hover:text-cyan-600 dark:hover:text-cyan-400"
                          title="View on site"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEdit(page)}
                        className="p-1.5 text-cyan-600 hover:text-cyan-800 dark:text-cyan-400"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(page._id)}
                        className="p-1.5 text-red-600 hover:text-red-800 dark:text-red-400"
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

      {showModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingPage ? "Edit page" : "Create page"}
                </h3>
                {!editingPage && (
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                    Pick a template or enter title — slug updates automatically until you edit it.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {!editingPage && (
                <div>
                  <p className="text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
                    Quick start (footer slugs)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {FOOTER_SITE_PAGE_TEMPLATES.map((t) => (
                      <button
                        key={t.slug}
                        type="button"
                        onClick={() => {
                          slugTouchedRef.current = false;
                          setFormData({
                            name: t.slug,
                            title: t.title,
                            content: t.content,
                            isActive: true,
                            order: t.order,
                          });
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                          formData.name === t.slug
                            ? "border-cyan-500 bg-cyan-50 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-200 dark:border-cyan-600"
                            : "border-gray-200 dark:border-slate-600 hover:border-cyan-300 dark:hover:border-cyan-700 text-gray-700 dark:text-slate-300"
                        }`}
                      >
                        {t.footerLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  Page title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100"
                  placeholder="About"
                />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  Shown as the page heading on the public site.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                  URL slug
                </label>
                <div className="flex rounded-lg border border-gray-300 dark:border-slate-600 overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500/40">
                  <span className="inline-flex items-center px-3 bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-400 text-sm border-r border-gray-300 dark:border-slate-600 shrink-0">
                    /sayfa/
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    disabled={!!editingPage}
                    className="flex-1 px-4 py-2 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-mono text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="about"
                  />
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                  {slugValid ? (
                    <span className="text-green-600 dark:text-green-400">
                      Public URL:{" "}
                      <Link
                        href={publicPagePath(formData.name)}
                        target="_blank"
                        className="underline font-mono"
                      >
                        {publicPagePath(formData.name)}
                      </Link>
                    </span>
                  ) : formData.name ? (
                    <span className="text-red-600 dark:text-red-400">
                      Use lowercase letters, numbers, and hyphens only.
                    </span>
                  ) : (
                    <span className="text-gray-500 dark:text-slate-400">
                      Example: title &quot;About&quot; → slug <code>about</code>
                    </span>
                  )}
                  {slugIsFooter && slugValid && (
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300">
                      Footer link
                    </span>
                  )}
                </div>
                {editingPage && (
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                    Slug cannot be changed after creation (would break links).
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                    Content (HTML)
                  </label>
                  <div className="flex gap-1">
                    {(["h1", "h2", "h3", "p"] as const).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => insertTag(tag)}
                        className="p-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs font-mono uppercase"
                        title={`Insert ${tag}`}
                      >
                        {tag === "h1" ? <Heading1 className="w-4 h-4" /> : tag === "p" ? <FileText className="w-4 h-4" /> : <Type className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  id="content-editor"
                  required
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  rows={10}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 font-mono text-sm"
                  placeholder="<h1>About</h1>&#10;<p>Your content here…</p>"
                />
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-cyan-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    Published (active)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-700 dark:text-slate-300">Sort order</label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        order: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className="w-20 px-3 py-1.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={!slugValid}
                  className="flex-1 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingPage ? "Save changes" : "Create page"}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 rounded-lg font-medium"
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
