"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, ChevronDown } from "lucide-react";
import {
  canShareEventIcsFile,
  downloadEventIcs,
  eventToCalendarPayload,
  googleCalendarUrl,
  openCalendarLink,
  outlookCalendarUrl,
  shareEventIcsFile,
} from "@/app/lib/event-calendar";
import { showAppToast } from "@/app/lib/app-toast";

type EventLike = {
  _id: string;
  name?: string;
  startTime: string;
  endTime: string;
  eventDetails?: string;
  type?: string;
  eventLink?: string;
  location?: string;
  facility?: { name?: string } | string;
  salon?: { name?: string } | string;
  city?: string;
  districtName?: string;
  country?: string;
};

type Props = {
  event: EventLike;
  className?: string;
};

export default function AddToCalendarButton({ event, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const payload = useMemo(() => eventToCalendarPayload(event), [event]);
  const canShareIcs = canShareEventIcsFile();

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [open]);

  const handleGoogle = () => {
    const url = googleCalendarUrl(payload);
    if (!url) {
      showAppToast("Could not build Google Calendar link.", "error");
      return;
    }
    openCalendarLink(url);
    setOpen(false);
  };

  const handleOutlook = () => {
    const url = outlookCalendarUrl(payload);
    if (!url) {
      showAppToast("Could not build Outlook Calendar link.", "error");
      return;
    }
    openCalendarLink(url);
    setOpen(false);
  };

  const handleDownload = () => {
    const ok = downloadEventIcs(payload);
    if (!ok) {
      showAppToast("Could not download calendar file.", "error");
      return;
    }
    showAppToast("Calendar file downloaded.", "success");
    setOpen(false);
  };

  const handleShare = async () => {
    const ok = await shareEventIcsFile(payload);
    if (!ok) {
      handleDownload();
      return;
    }
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="px-4 py-2.5 text-sm font-medium text-cyan-800 dark:text-cyan-100 bg-cyan-100 dark:bg-cyan-900/40 hover:bg-cyan-200 dark:hover:bg-cyan-900/60 rounded-lg flex items-center gap-2 transition-colors"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <CalendarPlus className="w-4 h-4" />
        Add to calendar
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 min-w-[220px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-slate-600 dark:bg-slate-800"
        >
          {canShareIcs && (
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleShare()}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              Share to phone calendar
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={handleGoogle}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Google Calendar
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleOutlook}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Outlook
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={handleDownload}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-slate-100 dark:hover:bg-slate-700"
          >
            Download .ics (Apple & others)
          </button>
        </div>
      )}
    </div>
  );
}
