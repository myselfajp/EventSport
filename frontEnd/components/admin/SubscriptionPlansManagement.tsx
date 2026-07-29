"use client";

import { useEffect, useState } from "react";
import { Edit2, Save, X } from "lucide-react";
import { fetchJSON } from "../../app/lib/api";
import { EP } from "../../app/lib/endpoints";

interface SubscriptionPlan {
  _id: string;
  key: string;
  name: string;
  description: string;
  priceTry: number;
  eventCredits: number;
  replyCredits: number;
  order: number;
  isActive: boolean;
  badge: string;
  stripePriceId?: string | null;
}

type FormState = {
  name: string;
  description: string;
  priceTry: string;
  eventCredits: string;
  replyCredits: string;
  order: string;
  isActive: boolean;
  badge: string;
};

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  priceTry: "0",
  eventCredits: "0",
  replyCredits: "0",
  order: "0",
  isActive: true,
  badge: "",
});

export default function SubscriptionPlansManagement() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [applyUserId, setApplyUserId] = useState("");
  const [applyPlanKey, setApplyPlanKey] = useState("active");
  const [applyMode, setApplyMode] = useState<"addCredits" | "replace">("addCredits");
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    void fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetchJSON(EP.ADMIN.subscriptionPlans.list, { method: "GET" });
      if (res?.success && Array.isArray(res?.data)) {
        setPlans(res.data);
      } else {
        setError(res?.message || res?.error || "Failed to load subscription plans");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setSuccess("");
    setError("");
    setForm({
      name: plan.name,
      description: plan.description || "",
      priceTry: String(plan.priceTry ?? 0),
      eventCredits: String(plan.eventCredits ?? 0),
      replyCredits: String(plan.replyCredits ?? 0),
      order: String(plan.order ?? 0),
      isActive: plan.isActive !== false,
      badge: plan.badge || "",
    });
  };

  const closeEdit = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const handleApplyPlan = async () => {
    const userId = applyUserId.trim();
    if (!userId) {
      setError("Enter a user id (MongoDB ObjectId) that has a coach profile.");
      return;
    }
    try {
      setApplying(true);
      setError("");
      setSuccess("");
      const res = await fetchJSON(EP.ADMIN.subscriptionPlans.applyToUser(userId), {
        method: "POST",
        body: { planKey: applyPlanKey, mode: applyMode },
      });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Could not apply plan");
      }
      const d = res.data;
      setSuccess(
        `Applied ${applyPlanKey}: tier=${d?.subscriptionTier}, events=${d?.eventCredits}, replies=${d?.replyCredits}`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Could not apply plan");
    } finally {
      setApplying(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      setError("");
      setSuccess("");
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        priceTry: Number(form.priceTry),
        eventCredits: Number(form.eventCredits),
        replyCredits: Number(form.replyCredits),
        order: Number(form.order),
        isActive: form.isActive,
        badge: form.badge.trim(),
      };
      const res = await fetchJSON(EP.ADMIN.subscriptionPlans.update(editing._id), {
        method: "PUT",
        body: payload,
      });
      if (!res?.success) {
        throw new Error(res?.message || res?.error || "Update failed");
      }
      setSuccess("Plan updated");
      closeEdit();
      await fetchPlans();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
          Subscription plans
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          Coach membership prices (TRY) and credit limits. Basic stays free. Stripe checkout
          will use these plans later.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </div>
      )}

      <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-slate-100">
            Apply plan to coach (until Stripe)
          </h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 mt-0.5">
            Use addCredits for upgrade carry-over (remaining + new plan credits). replace resets
            credits to the plan amounts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400 grow min-w-[200px]">
            User ID
            <input
              className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-mono"
              value={applyUserId}
              onChange={(e) => setApplyUserId(e.target.value)}
              placeholder="24-char MongoDB user _id"
            />
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400">
            Plan
            <select
              className="mt-1 block rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              value={applyPlanKey}
              onChange={(e) => setApplyPlanKey(e.target.value)}
            >
              {plans.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}
                </option>
              ))}
              {plans.length === 0 && (
                <>
                  <option value="basic">Basic</option>
                  <option value="active">Active</option>
                  <option value="frequent">Frequent</option>
                  <option value="power">Power</option>
                </>
              )}
            </select>
          </label>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400">
            Mode
            <select
              className="mt-1 block rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              value={applyMode}
              onChange={(e) =>
                setApplyMode(e.target.value === "replace" ? "replace" : "addCredits")
              }
            >
              <option value="addCredits">addCredits (carry-over)</option>
              <option value="replace">replace</option>
            </select>
          </label>
          <button
            type="button"
            disabled={applying}
            onClick={() => void handleApplyPlan()}
            className="px-3 py-2 text-sm rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60"
          >
            {applying ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-left text-gray-600 dark:text-slate-300">
              <tr>
                <th className="px-3 py-2 font-medium">Key</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Price (TRY)</th>
                <th className="px-3 py-2 font-medium">Events</th>
                <th className="px-3 py-2 font-medium">Replies</th>
                <th className="px-3 py-2 font-medium">Badge</th>
                <th className="px-3 py-2 font-medium">Active</th>
                <th className="px-3 py-2 font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
              {plans.map((plan) => (
                <tr key={plan._id} className="bg-white dark:bg-slate-900">
                  <td className="px-3 py-2 font-mono text-xs text-cyan-700 dark:text-cyan-400">
                    {plan.key}
                  </td>
                  <td className="px-3 py-2 text-gray-900 dark:text-slate-100">{plan.name}</td>
                  <td className="px-3 py-2">{plan.priceTry}</td>
                  <td className="px-3 py-2">{plan.eventCredits}</td>
                  <td className="px-3 py-2">{plan.replyCredits}</td>
                  <td className="px-3 py-2 text-gray-500">{plan.badge || "—"}</td>
                  <td className="px-3 py-2">{plan.isActive ? "Yes" : "No"}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(plan)}
                      className="inline-flex items-center gap-1 text-cyan-600 hover:text-cyan-700 dark:text-cyan-400 text-xs font-medium"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    No plans found. Restart the backend to seed defaults.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
              <h3 className="font-semibold text-gray-900 dark:text-slate-100">
                Edit {editing.key}
              </h3>
              <button type="button" onClick={closeEdit} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                Name
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                Description
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Price (TRY)
                  <input
                    type="number"
                    min={0}
                    disabled={editing.key === "basic"}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm disabled:opacity-60"
                    value={form.priceTry}
                    onChange={(e) => setForm((f) => ({ ...f, priceTry: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Order
                  <input
                    type="number"
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    value={form.order}
                    onChange={(e) => setForm((f) => ({ ...f, order: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Event credits
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    value={form.eventCredits}
                    onChange={(e) => setForm((f) => ({ ...f, eventCredits: e.target.value }))}
                  />
                </label>
                <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                  Reply credits
                  <input
                    type="number"
                    min={0}
                    className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    value={form.replyCredits}
                    onChange={(e) => setForm((f) => ({ ...f, replyCredits: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block text-xs font-medium text-gray-600 dark:text-slate-400">
                Badge
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                  value={form.badge}
                  onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))}
                  placeholder="e.g. Most popular"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                />
                Active (visible on Upgrade page)
              </label>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-slate-700">
              <button
                type="button"
                onClick={closeEdit}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60"
              >
                <Save className="w-4 h-4" />
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
