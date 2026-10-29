"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, PlusCircle } from "lucide-react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";
import {
  ALL_CONTRACT_DOC_TYPES,
  LOCKED_SIGNUP_DOC_TYPES,
  getDocTypeLabel,
  type SignupConsentDocument,
  type SignupConsentItem,
} from "@/app/lib/contract-documents";
import RegistrationConsentLabel from "../auth/RegistrationConsentLabel";
import LegalContentModal from "../auth/LegalContentModal";

type AdminConsentItem = SignupConsentItem & {
  enabled: boolean;
};

type FormState = {
  checkboxLabel: string;
  docTypes: string[];
  required: boolean;
  enabled: boolean;
};

const EMPTY_FORM: FormState = {
  checkboxLabel: "I agree to the {{terms}}.",
  docTypes: ["terms"],
  required: true,
  enabled: true,
};

export default function RegistrationConsentsManagement() {
  const [items, setItems] = useState<AdminConsentItem[]>([]);
  const [knownDocTypes, setKnownDocTypes] = useState<string[]>([...ALL_CONTRACT_DOC_TYPES]);
  const [titleByType, setTitleByType] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<AdminConsentItem | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [viewDoc, setViewDoc] = useState<{ title: string; content: string } | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const [consentsRes, legalRes] = await Promise.all([
        fetchJSON(EP.ADMIN.registrationConsents.list, { method: "GET" }),
        fetchJSON(EP.ADMIN.legal.list(), { method: "GET" }),
      ]);

      if (consentsRes?.success && Array.isArray(consentsRes.data)) {
        setItems(consentsRes.data);
      } else {
        setError(consentsRes?.message || consentsRes?.error || "Failed to load registration checkboxes.");
      }

      if (legalRes?.success && Array.isArray(legalRes.data)) {
        const titles: Record<string, string> = {};
        const types = new Set<string>(ALL_CONTRACT_DOC_TYPES);
        for (const doc of legalRes.data) {
          if (!doc?.docType) continue;
          types.add(doc.docType);
          if (doc.isActive && doc.title) titles[doc.docType] = doc.title;
          else if (!titles[doc.docType] && doc.title) titles[doc.docType] = doc.title;
        }
        setKnownDocTypes([...types]);
        setTitleByType(titles);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load registration checkboxes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const previewDocuments: SignupConsentDocument[] = useMemo(
    () =>
      form.docTypes.map((docType) => ({
        _id: docType,
        docType,
        title: titleByType[docType] || getDocTypeLabel(docType),
        content: "",
        version: 1,
      })),
    [form.docTypes, titleByType]
  );

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item: AdminConsentItem) => {
    setEditing(item);
    setForm({
      checkboxLabel: item.checkboxLabel,
      docTypes: [...item.docTypes],
      required: item.required,
      enabled: item.enabled,
    });
    setShowModal(true);
  };

  const insertToken = (docType: string) => {
    const token = `{{${docType}}}`;
    setForm((prev) => ({
      ...prev,
      checkboxLabel: prev.checkboxLabel.includes(token)
        ? prev.checkboxLabel
        : `${prev.checkboxLabel.trim()} ${token}`.trim(),
      docTypes: prev.docTypes.includes(docType) ? prev.docTypes : [...prev.docTypes, docType],
    }));
  };

  const toggleDocType = (docType: string) => {
    setForm((prev) => {
      const selected = prev.docTypes.includes(docType)
        ? prev.docTypes.filter((value) => value !== docType)
        : [...prev.docTypes, docType];
      return { ...prev, docTypes: selected };
    });
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setError("");
      if (!form.checkboxLabel.trim()) {
        setError("Checkbox sentence is required.");
        return;
      }
      if (form.docTypes.length === 0) {
        setError("Select at least one contract.");
        return;
      }

      const body = {
        checkboxLabel: form.checkboxLabel.trim(),
        docTypes: form.docTypes,
        required: form.required,
        enabled: form.enabled,
      };

      const res = editing
        ? await fetchJSON(EP.ADMIN.registrationConsents.update(editing._id), {
            method: "PUT",
            body,
          })
        : await fetchJSON(EP.ADMIN.registrationConsents.create, {
            method: "POST",
            body,
          });

      if (!res?.success) {
        setError(res?.message || res?.error || "Failed to save checkbox.");
        return;
      }
      setShowModal(false);
      setEditing(null);
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to save checkbox.");
    }
  };

  const handleToggleEnabled = async (item: AdminConsentItem) => {
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.registrationConsents.update(item._id), {
        method: "PUT",
        body: { enabled: !item.enabled },
      });
      if (!res?.success) {
        setError(res?.message || res?.error || "Failed to update checkbox.");
        return;
      }
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to update checkbox.");
    }
  };

  const handleDelete = async (item: AdminConsentItem) => {
    if (!window.confirm("Delete this registration checkbox?")) return;
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.registrationConsents.remove(item._id), {
        method: "DELETE",
      });
      if (!res?.success) {
        setError(res?.message || res?.error || "Failed to delete checkbox.");
        return;
      }
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to delete checkbox.");
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    const current = next[index];
    next[index] = next[target];
    next[target] = current;
    setItems(next);
    try {
      setError("");
      const res = await fetchJSON(EP.ADMIN.registrationConsents.reorder, {
        method: "PUT",
        body: { ids: next.map((item) => item._id) },
      });
      if (!res?.success) {
        setError(res?.message || res?.error || "Failed to reorder checkboxes.");
        await load();
      }
    } catch (err: any) {
      setError(err.message || "Failed to reorder checkboxes.");
      await load();
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 dark:text-slate-400 max-w-3xl leading-relaxed">
        These checkboxes appear on the Create Account form. Write the sentence users see, then attach
        one or more contracts. Use tokens like{" "}
        <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">{"{{terms}}"}</code> to insert a
        clickable contract title. Terms and KVKK must stay on an enabled required checkbox. New
        registrations are logged under Acceptance log.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
        >
          <PlusCircle className="w-4 h-4" />
          Add checkbox
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
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-slate-400">
            No registration checkboxes yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-slate-700">
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100 w-20">
                    Order
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Sentence
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Contracts
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Required
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Visible
                  </th>
                  <th className="border-b border-gray-300 dark:border-slate-600 p-3 text-left text-sm font-medium text-gray-900 dark:text-slate-100">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-slate-800">
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3">
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="p-1 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-40"
                          aria-label="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => move(index, 1)}
                          disabled={index === items.length - 1}
                          className="p-1 rounded border border-gray-300 dark:border-slate-600 disabled:opacity-40"
                          aria-label="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm text-gray-900 dark:text-slate-100">
                      {item.checkboxLabel}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      <div className="flex flex-wrap gap-1">
                        {item.docTypes.map((docType) => {
                          const hasActive = item.documents?.some((doc) => doc.docType === docType);
                          return (
                            <span
                              key={docType}
                              className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                hasActive
                                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                  : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                              }`}
                              title={hasActive ? "Active version available" : "No active version"}
                            >
                              {getDocTypeLabel(docType)}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      {item.required ? "Yes" : "Optional"}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3 text-sm">
                      {item.enabled ? "Yes" : "Hidden"}
                    </td>
                    <td className="border-b border-gray-300 dark:border-slate-600 p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                          className="px-3 py-1 bg-cyan-600 text-white rounded hover:bg-cyan-700 text-sm font-medium"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleEnabled(item)}
                          className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm font-medium"
                        >
                          {item.enabled ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border border-gray-200 dark:border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-slate-100">
                {editing ? "Edit registration checkbox" : "Add registration checkbox"}
              </h3>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                One sentence can link one or more contracts. Locked types:{" "}
                {LOCKED_SIGNUP_DOC_TYPES.map((docType) => getDocTypeLabel(docType)).join(", ")}.
              </p>
            </div>
            <form onSubmit={handleSave} className="flex flex-col flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                    Checkbox sentence
                  </label>
                  <textarea
                    value={form.checkboxLabel}
                    onChange={(e) => setForm((prev) => ({ ...prev, checkboxLabel: e.target.value }))}
                    rows={3}
                    maxLength={500}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100 text-sm"
                    placeholder='I agree to the {{terms}} and the {{kvkk}}.'
                  />
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.docTypes.map((docType) => (
                      <button
                        key={docType}
                        type="button"
                        onClick={() => insertToken(docType)}
                        className="px-2 py-1 text-[11px] rounded bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-200"
                      >
                        Insert {`{{${docType}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                    Linked contracts
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {knownDocTypes.map((docType) => (
                      <label
                        key={docType}
                        className="flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={form.docTypes.includes(docType)}
                          onChange={() => toggleDocType(docType)}
                          className="rounded border-gray-300 dark:border-slate-600"
                        />
                        <span>
                          {getDocTypeLabel(docType)}
                          <span className="block text-[11px] text-gray-400 font-mono">{docType}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-slate-400 mt-2">
                    Create a new contract type under Legal Documents first, activate a version, then
                    attach it here.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.required}
                      onChange={(e) => setForm((prev) => ({ ...prev, required: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                    Required
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={form.enabled}
                      onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
                      className="rounded border-gray-300 dark:border-slate-600"
                    />
                    Visible on registration
                  </label>
                </div>

                <div className="rounded-lg border border-gray-200 dark:border-slate-600 p-3">
                  <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mb-2">Preview</p>
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    <RegistrationConsentLabel
                      label={form.checkboxLabel || " "}
                      documents={previewDocuments}
                      onOpen={(doc) => setViewDoc({ title: doc.title, content: "Active contract text is edited in Legal Documents." })}
                    />
                  </p>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm rounded-lg bg-cyan-600 text-white hover:bg-cyan-700"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {viewDoc && (
        <LegalContentModal
          title={viewDoc.title}
          content={viewDoc.content}
          onClose={() => setViewDoc(null)}
        />
      )}
    </div>
  );
}
