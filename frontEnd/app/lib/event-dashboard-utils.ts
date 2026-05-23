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
