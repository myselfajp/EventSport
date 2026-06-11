export function formatEventDateTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

/** Returns human-readable countdown until start, e.g. "2h 15m" */
export function formatCountdownToStart(startTime: string, nowMs = Date.now()) {
  const diff = new Date(startTime).getTime() - nowMs;
  if (diff <= 0) return null;

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "< 1m";
}

export function isUpcomingEvent(
  event: { startTime?: string; status?: string },
  nowMs = Date.now()
) {
  if (!event.startTime) return false;
  if (event.status === "cancelled") return false;
  return new Date(event.startTime).getTime() > nowMs;
}

export function isHotEvent(startTime: string, nowMs = Date.now(), windowHours = 3) {
  const start = new Date(startTime).getTime();
  const windowMs = windowHours * 60 * 60 * 1000;
  return start > nowMs && start <= nowMs + windowMs;
}

export const DEFAULT_CHECK_IN_OPENS_HOURS = 48;

export type CheckInEventRef = {
  startTime?: string;
  checkInOpensHoursBeforeStart?: number;
  checkInOpensAt?: string;
  style?: { checkInOpensHoursBeforeStart?: number } | null;
};

export function resolveCheckInOpensHours(event: CheckInEventRef): number {
  if (
    typeof event.checkInOpensHoursBeforeStart === "number" &&
    event.checkInOpensHoursBeforeStart >= 0
  ) {
    return event.checkInOpensHoursBeforeStart;
  }
  const styleHours = event.style?.checkInOpensHoursBeforeStart;
  if (typeof styleHours === "number" && styleHours >= 0) return styleHours;
  return DEFAULT_CHECK_IN_OPENS_HOURS;
}

export function getCheckInOpensAt(event: CheckInEventRef): string | null {
  if (event.checkInOpensAt) return event.checkInOpensAt;
  if (!event.startTime) return null;
  const hours = resolveCheckInOpensHours(event);
  const startMs = new Date(event.startTime).getTime();
  return new Date(startMs - hours * 60 * 60 * 1000).toISOString();
}

/** Countdown until check-in opens, or "Open now" if window is active */
export function formatCheckInCountdown(
  checkInOpensAt: string,
  startTime: string,
  nowMs = Date.now()
) {
  const opens = new Date(checkInOpensAt).getTime();
  const start = new Date(startTime).getTime();
  const now = nowMs;

  if (now >= opens && now < start) return "Open now";
  if (now >= start) return null;

  const diff = opens - now;
  if (diff <= 0) return "Open now";

  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 72) {
    const days = Math.ceil(hours / 24);
    return `Opens in ${days} day${days === 1 ? "" : "s"}`;
  }

  if (hours > 0 && minutes > 0) return `Opens in ${hours}h ${minutes}m`;
  if (hours > 0) return `Opens in ${hours}h`;
  if (minutes > 0) return `Opens in ${minutes}m`;
  return "Opens in < 1m";
}
