import { getEventInviteUrl } from "@/app/lib/event-share";

export type EventCalendarPayload = {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  url?: string;
  type?: string;
  eventLink?: string;
};

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function toIsoUtc(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
  return cleaned.slice(0, 60) || "event";
}

export function buildEventCalendarLocation(event: {
  type?: string;
  eventLink?: string;
  location?: string;
  facility?: { name?: string } | string;
  salon?: { name?: string } | string;
  city?: string;
  districtName?: string;
  country?: string;
}): string {
  if (event.type === "Online") {
    return event.eventLink?.trim() || "Online";
  }

  const parts: string[] = [];
  const facilityName =
    typeof event.facility === "object" ? event.facility?.name : undefined;
  const salonName = typeof event.salon === "object" ? event.salon?.name : undefined;

  if (facilityName) parts.push(facilityName);
  if (salonName) parts.push(salonName);
  if (event.location?.trim()) parts.push(event.location.trim());

  const locality = [event.districtName, event.city, event.country].filter(Boolean).join(", ");
  if (locality) parts.push(locality);

  return parts.join(" · ") || "EventSport";
}

export function eventToCalendarPayload(event: {
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
}): EventCalendarPayload {
  const location = buildEventCalendarLocation(event);
  const eventUrl = getEventInviteUrl(String(event._id));
  const descriptionParts = [event.eventDetails?.trim(), `View on EventSport: ${eventUrl}`].filter(
    Boolean
  );

  return {
    eventId: String(event._id),
    title: event.name?.trim() || "EventSport event",
    startTime: event.startTime,
    endTime: event.endTime,
    description: descriptionParts.join("\n\n"),
    location,
    url: event.type === "Online" ? event.eventLink || eventUrl : eventUrl,
    type: event.type,
    eventLink: event.eventLink,
  };
}

export function buildEventIcs(payload: EventCalendarPayload): string {
  const start = toIcsUtc(payload.startTime);
  const end = toIcsUtc(payload.endTime);
  const stamp = toIcsUtc(new Date().toISOString());
  if (!start || !end) return "";

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//EventSport//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${payload.eventId}@eventsport`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(payload.title)}`,
  ];

  if (payload.description) {
    lines.push(`DESCRIPTION:${escapeIcsText(payload.description)}`);
  }
  if (payload.location) {
    lines.push(`LOCATION:${escapeIcsText(payload.location)}`);
  }
  if (payload.url) {
    lines.push(`URL:${escapeIcsText(payload.url)}`);
  }

  lines.push("END:VEVENT", "END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function googleCalendarUrl(payload: EventCalendarPayload): string {
  const start = toIcsUtc(payload.startTime);
  const end = toIcsUtc(payload.endTime);
  if (!start || !end) return "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: payload.title,
    dates: `${start}/${end}`,
  });
  if (payload.description) params.set("details", payload.description);
  if (payload.location) params.set("location", payload.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(payload: EventCalendarPayload): string {
  const start = toIsoUtc(payload.startTime);
  const end = toIsoUtc(payload.endTime);
  if (!start || !end) return "";

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: payload.title,
    startdt: start,
    enddt: end,
  });
  if (payload.description) params.set("body", payload.description);
  if (payload.location) params.set("location", payload.location);

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadEventIcs(payload: EventCalendarPayload): boolean {
  const ics = buildEventIcs(payload);
  if (!ics || typeof window === "undefined") return false;

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${sanitizeFilename(payload.title)}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  return true;
}

export function canShareEventIcsFile(): boolean {
  if (typeof navigator === "undefined" || typeof File === "undefined") return false;
  if (!navigator.share) return false;
  try {
    const file = new File(["test"], "test.ics", { type: "text/calendar" });
    return navigator.canShare?.({ files: [file] }) ?? false;
  } catch {
    return false;
  }
}

export async function shareEventIcsFile(payload: EventCalendarPayload): Promise<boolean> {
  if (!canShareEventIcsFile() || typeof navigator === "undefined") return false;

  const ics = buildEventIcs(payload);
  if (!ics) return false;

  const file = new File([ics], `${sanitizeFilename(payload.title)}.ics`, {
    type: "text/calendar",
  });

  try {
    await navigator.share({
      title: payload.title,
      text: payload.title,
      files: [file],
    });
    return true;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return true;
    return false;
  }
}

export function openCalendarLink(url: string): void {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}
