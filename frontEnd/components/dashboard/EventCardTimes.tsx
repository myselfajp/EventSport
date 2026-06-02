"use client";

import React from "react";
import { Calendar, Clock } from "lucide-react";
import {
  formatEventDateTime,
  getCheckInOpensAt,
  type CheckInEventRef,
} from "@/app/lib/event-dashboard-utils";

type EventCardTimesProps = {
  event: CheckInEventRef & { startTime: string };
  startLabel?: string;
  checkInLabel?: string;
  className?: string;
};

export default function EventCardTimes({
  event,
  startLabel = "Starts",
  checkInLabel = "Check-in",
  className = "",
}: EventCardTimesProps) {
  const checkInAt = getCheckInOpensAt(event);

  return (
    <div className={className}>
      <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-600 dark:text-slate-300">
        <Calendar className="w-3.5 h-3.5 shrink-0" />
        <span>
          {startLabel} {formatEventDateTime(event.startTime)}
        </span>
      </div>
      {checkInAt && (
        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-slate-400">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>
            {checkInLabel} {formatEventDateTime(checkInAt)}
          </span>
        </div>
      )}
    </div>
  );
}
