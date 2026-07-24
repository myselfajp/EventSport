"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

type CatalogItem = { key: string; label: string };
type Group = {
  _id: string;
  name: string;
  slug: string;
  permissions: string[];
  description?: string;
  isSystem?: boolean;
};

export default function AdminPermissionGroupsManagement() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    permissions: [] as string[],
  });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [gRes, cRes] = await Promise.all([
        fetchJSON(EP.ADMIN.permissionGroups.list, { method: "GET" }),
        fetchJSON(EP.ADMIN.permissionCatalog, { method: "GET" }),
      ]);
      if (gRes?.success) setGroups(gRes.data || []);
      else setError(gRes?.message || "Could not load groups");
      if (cRes?.success) setCatalog(cRes.data || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", permissions: [] });
    setShowForm(true);
  };

  const openEdit = (g: Group) => {
    if (g.isSystem) return;
    setEditing(g);
    setForm({
      name: g.name,
      slug: g.slug,
      description: g.description || "",
      permissions: [...(g.permissions || [])],
    });
    setShowForm(true);
  };

  const togglePerm = (key: string) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(key)
        ? f.permissions.filter((p) => p !== key)
        : [...f.permissions, key],
    }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.slug.trim()) {
      setError("Name and slug are required.");
      return;
    }
    if (form.permissions.length === 0) {
      setError("Select at least one permission.");
      return;
    }
    try {
      if (editing) {
        const res = await fetchJSON(EP.ADMIN.permissionGroups.update(editing._id), {
          method: "PUT",
          body: {
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            permissions: form.permissions,
          },
        });
        if (!res?.success) {
          setError(res?.message || "Update failed");
          return;
        }
      } else {
        const res = await fetchJSON(EP.ADMIN.permissionGroups.create, {
          method: "POST",
          body: {
            name: form.name.trim(),
            slug: form.slug.trim(),
            description: form.description.trim(),
            permissions: form.permissions,
          },
        });
        if (!res?.success) {
          setError(res?.message || "Create failed");
          return;
        }
      }
      setShowForm(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    }
  };

  const remove = async (g: Group) => {
    if (g.isSystem) return;
    if (!confirm(`Delete group "${g.name}"?`)) return;
    setError("");
    try {
      const res = await fetchJSON(EP.ADMIN.permissionGroups.delete(g._id), {
        method: "DELETE",
      });
      if (!res?.success) {
        setError(res?.message || "Delete failed");
        return;
      }
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-600 dark:text-slate-400">Loading…</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
          {error}
        </div>
      )}
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-sm text-gray-600 dark:text-slate-400 max-w-2xl">
          Assigned to admin users. If no group is set, the user has <strong>full access</strong> (legacy behavior).
          The <code className="ml-1 text-xs">*</code> permission grants access to all panel APIs.
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm font-medium"
        >
          New group
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 dark:border-slate-600 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-slate-700">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Slug</th>
              <th className="text-left p-2">Permissions</th>
              <th className="text-left p-2">System</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g._id} className="border-t border-gray-200 dark:border-slate-600">
                <td className="p-2 font-medium text-gray-900 dark:text-slate-100">{g.name}</td>
                <td className="p-2 text-gray-600 dark:text-slate-400 font-mono text-xs">{g.slug}</td>
                <td className="p-2 text-xs max-w-md break-words">
                  {(g.permissions || []).join(", ")}
                </td>
                <td className="p-2">{g.isSystem ? "Yes" : "—"}</td>
                <td className="p-2">
                  {!g.isSystem && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => openEdit(g)}
                        className="text-cyan-600 dark:text-cyan-400 hover:underline"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(g)}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-gray-900 dark:text-slate-100">
              {editing ? "Edit group" : "New permission group"}
            </h3>
            <form onSubmit={save} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Name
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Slug (URL-like, unique)
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600 font-mono text-sm"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                  Description
                </label>
                <input
                  className="w-full px-3 py-2 border rounded-lg dark:bg-slate-700 dark:border-slate-600"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-600 dark:text-slate-400 mb-2">
                  Permissions
                </span>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-2 dark:border-slate-600 space-y-1">
                  {catalog.map((c) => (
                    <label key={c.key} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(c.key)}
                        onChange={() => togglePerm(c.key)}
                      />
                      <span className="text-gray-800 dark:text-slate-200">{c.label}</span>
                      <span className="text-xs text-gray-400 font-mono">{c.key}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
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
