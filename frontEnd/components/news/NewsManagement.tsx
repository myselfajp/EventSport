"use client";

import React, { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CheckCircle2,
  Edit2,
  Eye,
  EyeOff,
  Filter,
  ImageIcon,
  Loader2,
  Newspaper,
  Plus,
  RefreshCw,
  Save,
  Search,
  X,
} from "lucide-react";
import { apiFetch, fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

type NewsStatus = "draft" | "published";
type StatusFilter = NewsStatus | "all";
type SportGroup = { _id: string; name: string };
type Sport = { _id: string; name: string; group?: string };
type NewsItem = {
  _id: string; title: string; slug: string; excerpt: string; content?: string;
  coverImage?: { path?: string; originalName?: string } | null;
  sportGroup?: SportGroup | string | null; sport?: Sport | string | null;
  author?: { name?: string; type?: string };
  status: NewsStatus; isActive: boolean;
  publishedAt?: string | null; createdAt?: string; updatedAt?: string;
};
type ApiResponse<T = unknown> = {
  success?: boolean; data?: T; message?: string; error?: string;
  pagination?: { currentPage?: number; totalPages?: number; total?: number; perPage?: number };
};
type NewsForm = { title: string; slug: string; excerpt: string; content: string; sportGroup: string; sport: string; status: NewsStatus; isActive: boolean };

const EMPTY_FORM: NewsForm = { title: "", slug: "", excerpt: "", content: "", sportGroup: "", sport: "", status: "published", isActive: true };

function relationId(v: SportGroup | Sport | string | null | undefined) { if (!v) return ""; return typeof v === "string" ? v : v._id || ""; }
function relationName(v: SportGroup | Sport | string | null | undefined) { if (!v) return ""; return typeof v === "string" ? "" : v.name || ""; }
function formatDate(v?: string | null) { if (!v) return "Not published"; return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(v)); }
function statusLabel(i: NewsItem) { if (isPublicNews(i)) return "Published"; if (!i.isActive) return "Inactive"; return i.status === "published" ? "Published" : "Draft"; }
function isPublicNews(i: NewsItem) { return i.status === "published" && i.isActive; }
function statusClass(i: NewsItem) {
  if (isPublicNews(i)) return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  if (!i.isActive) return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600";
  if (i.status === "published") return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900";
  return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900";
}
function getMsg(r: ApiResponse, f: string) { return r.message || r.error || f; }
async function parseResp<T>(res: Response): Promise<ApiResponse<T>> {
  const t = await res.text(); if (!t) return { success: res.ok };
  try { return JSON.parse(t) as ApiResponse<T>; } catch { return { success: res.ok, message: t }; }
}
async function fetchSports(groupId: string): Promise<Sport[]> {
  if (!groupId) return [];
  const r = await fetchJSON(EP.REFERENCE.sport.get, { method: "POST", body: { perPage: 100, pageNumber: 1, groupId } });
  return r?.success && Array.isArray(r.data) ? r.data : [];
}

export default function NewsManagement() {
  const newsApi = EP.ADMIN.news;
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [sportGroups, setSportGroups] = useState<SportGroup[]>([]);
  const [filterSports, setFilterSports] = useState<Sport[]>([]);
  const [formSports, setFormSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalPages: 1, total: 0, perPage: 50 });
  const [filters, setFilters] = useState({ search: "", sportGroup: "", sport: "", status: "all" as StatusFilter });
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState<NewsForm>(EMPTY_FORM);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  useEffect(() => { return () => { if (coverPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(coverPreviewUrl); }; }, [coverPreviewUrl]);

  useEffect(() => {
    let c = false;
    fetchJSON(EP.REFERENCE.sportGroup.get, { method: "POST", body: { perPage: 100, pageNumber: 1 } })
      .then(r => { if (!c && r?.success && Array.isArray(r.data)) setSportGroups(r.data); })
      .catch(e => console.error("sport groups:", e));
    return () => { c = true; };
  }, []);

  useEffect(() => {
    let c = false;
    if (!filters.sportGroup) { setFilterSports([]); setFilters(p => (p.sport ? { ...p, sport: "" } : p)); return; }
    fetchSports(filters.sportGroup).then(r => { if (!c) setFilterSports(r); }).catch(() => { if (!c) setFilterSports([]); });
    return () => { c = true; };
  }, [filters.sportGroup]);

  useEffect(() => {
    let c = false;
    if (!form.sportGroup) { setFormSports([]); return; }
    fetchSports(form.sportGroup).then(r => { if (!c) setFormSports(r); }).catch(() => { if (!c) setFormSports([]); });
    return () => { c = true; };
  }, [form.sportGroup]);

  const loadNews = useCallback(async () => {
    try {
      setLoading(true); setError("");
      const r = await fetchJSON(newsApi.list({ page, limit: pagination.perPage, search: filters.search.trim() || undefined, sportGroup: filters.sportGroup || undefined, sport: filters.sport || undefined, status: filters.status }), { method: "GET" });
      if (r?.success && Array.isArray(r.data)) {
        setNewsItems(r.data);
        setPagination({ totalPages: r.pagination?.totalPages || 1, total: r.pagination?.total || r.data.length, perPage: r.pagination?.perPage || 50 });
      } else { setNewsItems([]); setError(r?.message || r?.error || "Failed to load news"); }
    } catch (e) { setNewsItems([]); setError(e instanceof Error ? e.message : "Failed to load news"); }
    finally { setLoading(false); }
  }, [newsApi, filters, page, pagination.perPage]);

  useEffect(() => { void loadNews(); }, [loadNews]);

  const selGroupName = useMemo(() => sportGroups.find(g => g._id === filters.sportGroup)?.name || "", [filters.sportGroup, sportGroups]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setCoverFile(null); setCoverPreviewUrl(""); setError(""); setSuccess(""); setShowModal(true); };
  const openEdit = (item: NewsItem) => { setEditing(item); setForm({ title: item.title||"", slug: item.slug||"", excerpt: item.excerpt||"", content: item.content||"", sportGroup: relationId(item.sportGroup), sport: relationId(item.sport), status: item.status||"draft", isActive: item.isActive!==false }); setCoverFile(null); setCoverPreviewUrl(item.coverImage?.path ? EP.assetUrl(item.coverImage.path) : ""); setError(""); setSuccess(""); setShowModal(true); };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(EMPTY_FORM); setCoverFile(null); setCoverPreviewUrl(""); };
  const updateFilter = (key: keyof typeof filters, val: string) => { setFilters(p => ({ ...p, [key]: val, ...(key==="sportGroup"?{sport:""}:{}) })); setPage(1); };
  const updateForm = (key: keyof NewsForm, val: string|boolean) => { setForm(p => ({ ...p, [key]: val, ...(key==="sportGroup"?{sport:""}:{}) })); };
  const resetFilters = () => { setFilters({ search:"", sportGroup:"", sport:"", status:"all" }); setPage(1); };
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => { const f=e.target.files?.[0]||null; setCoverFile(f); if (f) setCoverPreviewUrl(URL.createObjectURL(f)); else setCoverPreviewUrl(editing?.coverImage?.path ? EP.assetUrl(editing.coverImage.path) : ""); };
  const validateForm = () => {
    if (form.title.trim().length<3) return "Title must be at least 3 characters.";
    if (form.excerpt.trim().length<10) return "Excerpt must be at least 10 characters.";
    if (form.content.trim().length<30) return "Content must be at least 30 characters.";
    if (form.sportGroup && !form.sport) return "Select a sport when a sport group is chosen.";
    if (!form.sportGroup && form.sport) return "Select a sport group when a sport is chosen.";
    if (!editing && !coverFile) return "Cover image is required.";
    if (editing && !coverFile && !editing.coverImage?.path) return "Cover image is required.";
    return "";
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ve = validateForm(); if (ve) { setError(ve); return; }
    const payload = { title: form.title.trim(), slug: form.slug.trim(), excerpt: form.excerpt.trim(), content: form.content.trim(), sportGroup: form.sportGroup || undefined, sport: form.sport || undefined, status: form.status, isActive: form.isActive };
    const body = new FormData(); body.append("data", JSON.stringify(payload)); if (coverFile) body.append("news-cover-image", coverFile);
    try {
      setSaving(true); setError(""); setSuccess("");
      const res = await apiFetch(editing ? newsApi.update(editing._id) : newsApi.create, { method: editing?"PUT":"POST", headers:{Accept:"application/json"}, body });
      const resp = await parseResp<NewsItem>(res);
      if (!res.ok||resp.success===false) { setError(getMsg(resp,"Failed to save news")); return; }
      closeModal(); setSuccess(editing?"News updated.":"News created."); await loadNews();
    } catch(e) { setError(e instanceof Error?e.message:"Failed to save news"); }
    finally { setSaving(false); }
  };

  const handleTogglePublish = async (item: NewsItem) => {
    const currentlyPublic = isPublicNews(item);

    if (currentlyPublic) {
      if (!confirm("Unpublish this news article? It will no longer be visible publicly.")) return;
      try {
        setTogglingId(item._id); setError(""); setSuccess("");
        const r = await fetchJSON(newsApi.delete(item._id), { method: "DELETE" });
        if (r?.success) { setSuccess("News unpublished."); await loadNews(); }
        else setError(r?.message || r?.error || "Failed to unpublish news");
      } catch (e) { setError(e instanceof Error ? e.message : "Failed to unpublish news"); }
      finally { setTogglingId(null); }
      return;
    }

    if (!confirm("Publish this news article? It will be visible on public news pages.")) return;
    try {
      setTogglingId(item._id); setError(""); setSuccess("");
      const body = new FormData();
      body.append("data", JSON.stringify({ status: "published", isActive: true }));
      const res = await apiFetch(newsApi.update(item._id), { method: "PUT", headers: { Accept: "application/json" }, body });
      const resp = await parseResp<NewsItem>(res);
      if (!res.ok || resp.success === false) { setError(getMsg(resp, "Failed to publish news")); return; }
      setSuccess("News published."); await loadNews();
    } catch (e) { setError(e instanceof Error ? e.message : "Failed to publish news"); }
    finally { setTogglingId(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">News</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">Create, edit, filter, and publish news articles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void loadNews()} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
            <RefreshCw className="w-4 h-4" />Refresh
          </button>
          <button type="button" onClick={openCreate} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors">
            <Plus className="w-4 h-4" />New News
          </button>
        </div>
      </div>

      {(error||success) && <div className={`rounded-lg border px-4 py-3 text-sm ${error?"border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300":"border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300"}`}>{error||success}</div>}

      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex items-center gap-2 shrink-0 pb-2 mr-1">
            <Filter className="w-4 h-4 text-gray-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Filters</span>
          </div>
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={filters.search} onChange={e => updateFilter("search", e.target.value)} placeholder="Search title or content" className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <select value={filters.status} onChange={e => updateFilter("status", e.target.value)} className="min-w-[130px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" aria-label="Status">
            <option value="all">All Statuses</option><option value="published">Published</option><option value="draft">Draft</option>
          </select>
          <select value={filters.sportGroup} onChange={e => updateFilter("sportGroup", e.target.value)} className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white" aria-label="Sport Group">
            <option value="">All Sport Groups</option>{sportGroups.map(g => <option key={g._id} value={g._id}>{g.name}</option>)}
          </select>
          <select value={filters.sport} disabled={!filters.sportGroup} onChange={e => updateFilter("sport", e.target.value)} className="min-w-[150px] px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-900 dark:text-white disabled:opacity-50" aria-label="Sport">
            <option value="">{filters.sportGroup ? `All ${selGroupName || "Sports"}` : "Select Sport Group first"}</option>
            {filterSports.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <button type="button" onClick={resetFilters} className="px-3 py-2 text-sm font-medium text-cyan-700 dark:text-cyan-300 hover:underline shrink-0">Clear</button>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <p className="text-sm text-gray-600 dark:text-slate-400">{pagination.total} article{pagination.total===1?"":"s"}</p>
          <p className="text-xs text-gray-500 dark:text-slate-500">Page {page} of {pagination.totalPages}</p>
        </div>
        {loading ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400"><Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin" />Loading news...</div>
        ) : newsItems.length===0 ? (
          <div className="py-12 text-center text-gray-500 dark:text-slate-400">No news found.</div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-slate-700">
            {newsItems.map(item => {
              const coverUrl = item.coverImage?.path ? EP.assetUrl(item.coverImage.path) : "";
              return (
                <article key={item._id} className="p-4 flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="w-full lg:w-32 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-700 shrink-0">
                    {coverUrl ? <img src={coverUrl} alt={item.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400"><ImageIcon className="w-6 h-6" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full border text-xs font-medium ${statusClass(item)}`}>{statusLabel(item)}</span>
                      {relationName(item.sportGroup)&&<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-cyan-50 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-300">{relationName(item.sportGroup)}</span>}
                      {relationName(item.sport)&&<span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300">{relationName(item.sport)}</span>}
                    </div>
                    <h3 className="font-semibold text-gray-950 dark:text-white truncate">{item.title}</h3>
                    <p className="mt-1 text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{item.excerpt}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{formatDate(item.publishedAt||item.createdAt)}</span>
                      <span>By {item.author?.name||"EventSport Team"}</span>
                      <span>/{item.slug}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {isPublicNews(item) && <Link href={`/news/${item.slug}`} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"><Eye className="w-4 h-4" />View</Link>}
                    <button type="button" onClick={()=>openEdit(item)} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"><Edit2 className="w-4 h-4" />Edit</button>
                    <button type="button" onClick={()=>void handleTogglePublish(item)} disabled={togglingId===item._id} className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm disabled:opacity-50 ${isPublicNews(item) ? "border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30" : "border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"}`}>
                      {togglingId===item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : isPublicNews(item) ? <EyeOff className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      {isPublicNews(item) ? "Unpublish" : "Publish"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-gray-200 dark:border-slate-700">
          <button type="button" disabled={page<=1||loading} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 disabled:opacity-50">Previous</button>
          <button type="button" disabled={page>=pagination.totalPages||loading} onClick={()=>setPage(p=>Math.min(pagination.totalPages,p+1))} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-700 text-sm text-gray-700 dark:text-slate-200 disabled:opacity-50">Next</button>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-950 dark:text-white">{editing?"Edit News":"New News"}</h3>
                <p className="text-sm text-gray-500 dark:text-slate-400">Cover image, category, and content are required.</p>
              </div>
              <button type="button" onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-500 dark:text-slate-400" aria-label="Close news form"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-73px)]">
              <div className="p-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Title</label>
                    <input value={form.title} onChange={e=>updateForm("title",e.target.value)} maxLength={180} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="Breaking: New sports event announced" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Slug (optional)</label>
                    <input value={form.slug} onChange={e=>updateForm("slug",e.target.value)} maxLength={220} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" placeholder="breaking-new-sports-event" />
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      Leave blank to auto-generate from the title. This becomes the URL path
                      (e.g. /news/your-slug).
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Excerpt</label>
                    <textarea value={form.excerpt} onChange={e=>updateForm("excerpt",e.target.value)} maxLength={320} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y" placeholder="Short summary shown on the news card" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Content</label>
                    <textarea value={form.content} onChange={e=>updateForm("content",e.target.value)} maxLength={20000} rows={12} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white resize-y leading-7" placeholder="Write the news content here" />
                  </div>
                </div>
                <aside className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cover Image</label>
                    <div className="rounded-lg border border-dashed border-gray-300 dark:border-slate-600 overflow-hidden bg-gray-50 dark:bg-slate-800">
                      <div className="aspect-[16/10] flex items-center justify-center">
                        {coverPreviewUrl ? <img src={coverPreviewUrl} alt="News cover preview" className="w-full h-full object-cover" /> : <div className="text-center text-gray-400 dark:text-slate-500"><ImageIcon className="w-8 h-8 mx-auto mb-2" /><span className="text-sm">No image selected</span></div>}
                      </div>
                      <div className="p-3 border-t border-gray-200 dark:border-slate-700">
                        <input type="file" accept="image/*" onChange={handleCoverChange} className="block w-full text-sm text-gray-600 dark:text-slate-300 file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sport Group (optional)</label>
                    <select value={form.sportGroup} onChange={e=>updateForm("sportGroup",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                      <option value="">Select Sport Group</option>{sportGroups.map(g=><option key={g._id} value={g._id}>{g.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sport (optional)</label>
                    <select value={form.sport} disabled={!form.sportGroup} onChange={e=>updateForm("sport",e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white disabled:opacity-50">
                      <option value="">Select Sport</option>{formSports.map(s=><option key={s._id} value={s._id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Status</label>
                    <select value={form.status} onChange={e => { const newStatus = e.target.value as NewsStatus; setForm(p => ({ ...p, status: newStatus, isActive: newStatus === "published" ? true : p.isActive })); }} className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white">
                      <option value="published">Published</option><option value="draft">Draft</option>
                    </select>
                  </div>
                  <label className="flex items-start gap-3 rounded-lg border border-gray-200 dark:border-slate-700 p-3 cursor-pointer">
                    <input type="checkbox" checked={form.isActive} onChange={e=>updateForm("isActive",e.target.checked)} className="mt-1" />
                    <span><span className="block text-sm font-medium text-gray-800 dark:text-slate-200">Active</span><span className="block text-xs text-gray-500 dark:text-slate-400">Inactive news are hidden from public pages.</span></span>
                  </label>
                </aside>
              </div>
              {error && <div className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-950/40">
                <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800">Cancel</button>
                <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium disabled:opacity-60">
                  {saving?<Loader2 className="w-4 h-4 animate-spin" />:<Save className="w-4 h-4" />}
                  {editing?"Save Changes":"Create News"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
