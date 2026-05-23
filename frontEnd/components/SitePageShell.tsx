"use client";

import Link from "next/link";
import SiteFooter from "./SiteFooter";

export default function SitePageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-gray-900 dark:text-slate-100 transition-colors">
      <header className="shrink-0 border-b border-gray-200 dark:border-slate-700 bg-white/85 dark:bg-slate-800/85 backdrop-blur px-4 py-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-semibold hover:underline"
        >
          ← Home
        </Link>
      </header>
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
