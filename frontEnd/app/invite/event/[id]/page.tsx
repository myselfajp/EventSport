"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Calendar, Users } from "lucide-react";

export default function InviteEventPage() {
  const params = useParams();
  const eventId =
    typeof params?.id === "string" ? params.id : String(params?.id ?? "");

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 p-8 text-center space-y-6">
        <div className="mx-auto w-14 h-14 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
          <Users className="w-7 h-7 text-cyan-600 dark:text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            You&apos;re invited!
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            Someone invited you to a sports event on EventSport. Log in or create
            an account to view the event and join.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-slate-900 rounded-lg py-2 px-3">
          <Calendar className="w-4 h-4 shrink-0" />
          <span className="truncate">Event ref: {eventId}</span>
        </div>
        <Link
          href="/"
          className="inline-block w-full px-6 py-3 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors"
        >
          Continue to EventSport
        </Link>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Download the app and join when you&apos;re ready.
        </p>
      </div>
    </div>
  );
}
