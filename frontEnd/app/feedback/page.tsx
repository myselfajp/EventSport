"use client";

import { useState } from "react";
import SitePageShell from "@/components/SitePageShell";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export default function FeedbackPage() {
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetchJSON(EP.PUBLIC.suggestion, {
        method: "POST",
        body: {
          contactName: contactName.trim() || undefined,
          email: email.trim() || undefined,
          message: message.trim(),
        },
      });
      if (res?.success) {
        setSuccess(res?.message || "Thank you — your suggestion has been received.");
        setMessage("");
        setContactName("");
        setEmail("");
      } else {
        setError(res?.error || res?.message || "Could not send.");
      }
    } catch (err: any) {
      setError(err?.message || "Could not send. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SitePageShell>
      <div className="max-w-lg mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Feedback form
        </h1>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-8">
          Share your feedback and suggestions; contact details are optional.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="feedback-name"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Name (optional)
            </label>
            <input
              id="feedback-name"
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              autoComplete="name"
            />
          </div>
          <div>
            <label
              htmlFor="feedback-email"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Email (optional)
            </label>
            <input
              id="feedback-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none"
              autoComplete="email"
            />
          </div>
          <div>
            <label
              htmlFor="feedback-message"
              className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1"
            >
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              id="feedback-message"
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              minLength={10}
              maxLength={4000}
              placeholder="At least 10 characters…"
              className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 outline-none resize-y min-h-[120px]"
            />
          </div>

          {success && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-800 dark:text-green-200">
              {success}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-800 dark:text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || message.trim().length < 10}
            className="w-full sm:w-auto inline-flex justify-center px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Sending…" : "Submit"}
          </button>
        </form>
      </div>
    </SitePageShell>
  );
}
