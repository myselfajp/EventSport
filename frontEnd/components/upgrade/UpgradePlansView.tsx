"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import { useMe } from "@/app/hooks/useAuth";

export type SubscriptionPlan = {
  _id: string;
  key: string;
  name: string;
  description?: string;
  priceTry: number;
  eventCredits: number;
  replyCredits: number;
  order?: number;
  badge?: string;
  isActive?: boolean;
};

function formatPriceTry(amount: number) {
  if (!amount || amount <= 0) return "Free";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function UpgradePlansView() {
  const { data: user } = useMe();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const coach = user?.coach && typeof user.coach === "object" ? user.coach : null;
  const currentTier = String(coach?.subscriptionTier || "").toLowerCase() || null;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetchJSON(
          EP.PUBLIC.subscriptionPlans,
          { method: "GET" },
          { skipAuth: true }
        );
        if (cancelled) return;
        if (!res?.success || !Array.isArray(res.data)) {
          throw new Error(res?.message || "Could not load plans");
        }
        setPlans(res.data);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load plans");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [plans]
  );

  return (
    <div className="space-y-8">
      <section className="text-center max-w-2xl mx-auto">
        <p className="text-sm font-semibold tracking-wide text-cyan-700 dark:text-cyan-400 uppercase">
          EventSport
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
          Upgrade
        </h1>
        <p className="mt-3 text-sm sm:text-base text-gray-600 dark:text-slate-300">
          Choose a coach membership. Create more events and reply to more Coach Me requests.
          Online payment arrives with Stripe; plans and prices are already live from admin.
        </p>
      </section>

      {coach && (
        <section className="rounded-2xl border border-cyan-200/70 dark:border-cyan-800/50 bg-cyan-50/70 dark:bg-cyan-950/20 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-cyan-800 dark:text-cyan-300">
                Your plan
              </p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                {currentTier || "basic"}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-slate-200">
              <div>
                <span className="text-gray-500 dark:text-slate-400">Event credits </span>
                <span className="font-semibold">{coach.eventCredits ?? 0}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-slate-400">Reply credits </span>
                <span className="font-semibold">{coach.replyCredits ?? 0}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-gray-500 dark:text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading plans…
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-5">
          {sortedPlans.map((plan) => {
            const isCurrent = currentTier === plan.key;
            const isHighlighted = Boolean(plan.badge) || plan.key === "frequent";
            const isFree = !plan.priceTry || plan.priceTry <= 0;

            return (
              <article
                key={plan._id || plan.key}
                className={`relative flex flex-col rounded-2xl border bg-white dark:bg-slate-900 p-5 sm:p-6 transition-shadow ${
                  isHighlighted
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/30"
                    : "border-gray-200 dark:border-slate-700"
                }`}
              >
                {plan.badge ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-cyan-600 px-3 py-1 text-[11px] font-semibold text-white shadow">
                    <Crown className="w-3 h-3" />
                    {plan.badge}
                  </span>
                ) : null}

                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h2>
                  <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                    {formatPriceTry(plan.priceTry)}
                    {!isFree && (
                      <span className="ml-1 text-sm font-medium text-gray-500 dark:text-slate-400">
                        / pack
                      </span>
                    )}
                  </p>
                  {plan.description ? (
                    <p className="mt-2 text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      {plan.description}
                    </p>
                  ) : null}
                </div>

                <ul className="space-y-2.5 text-sm text-gray-700 dark:text-slate-200 flex-1 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      <strong>{plan.eventCredits}</strong> event credits
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    <span>
                      <strong>{plan.replyCredits}</strong> Coach Me reply credits
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-cyan-600 dark:text-cyan-400" />
                    <span>Remaining credits carry over on upgrade</span>
                  </li>
                </ul>

                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-gray-600 dark:text-slate-300 cursor-default"
                  >
                    Current plan
                  </button>
                ) : isFree ? (
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-gray-500 dark:text-slate-400 cursor-default"
                  >
                    Included for new coaches
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Stripe checkout will be enabled when payment is ready"
                    className="w-full rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white opacity-80 cursor-not-allowed"
                  >
                    Checkout coming soon
                  </button>
                )}
              </article>
            );
          })}
        </section>
      )}

      {!loading && !error && sortedPlans.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-slate-400 py-10">
          No active plans yet. Ask an admin to seed subscription plans.
        </p>
      )}
    </div>
  );
}
