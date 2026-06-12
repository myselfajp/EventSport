import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  getCheckInOpensAt,
  isUpcomingEvent,
  type CheckInEventRef,
} from "@/app/lib/event-dashboard-utils";

export type DashboardEvent = CheckInEventRef & {
  _id: string;
  name: string;
  startTime: string;
  endTime?: string;
  status?: string;
  type?: string;
  sport?: { name?: string };
  facility?: { name?: string; _id?: string };
  photo?: { path?: string };
  banner?: { path?: string };
  reservation?: {
    isApproved?: boolean;
    isWaitListed?: boolean;
    isCheckedIn?: boolean;
    isJoined?: boolean;
  };
};

/** Active join for dashboard — not waitlisted; legacy rows may have isApproved false */
export function isDashboardJoinedReservation(event: DashboardEvent): boolean {
  if (!event.reservation) return false;
  if (event.reservation.isWaitListed) return false;
  return true;
}

export type DashboardUserMode = "gamer" | "coach" | "admin";

type MeUser = {
  role?: number;
  participant?: unknown;
  coach?: unknown;
};

export function getDashboardUserMode(user: MeUser): DashboardUserMode {
  if (user.role === 0) return "admin";
  if (user.coach) return "coach";
  return "gamer";
}

export function includesHostedEvents(user: MeUser): boolean {
  return !!user.coach || user.role === 0;
}

export function getYourNextEmptyMessage(mode: DashboardUserMode): string {
  if (mode === "gamer") {
    return "You haven't joined any upcoming event.";
  }
  return "You haven't joined or created any upcoming event.";
}

export function getCheckInEmptyMessage(mode: DashboardUserMode): string {
  if (mode === "gamer") {
    return "No check-in times for your joined events.";
  }
  return "No check-in times for your joined or hosted events.";
}

function dedupeUpcoming(events: DashboardEvent[]): DashboardEvent[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    if (!e._id || seen.has(e._id) || !isUpcomingEvent(e)) return false;
    seen.add(e._id);
    return true;
  });
}

export async function fetchUserDashboardEvents(
  user: MeUser
): Promise<DashboardEvent[]> {
  const includeHosted = includesHostedEvents(user);
  const candidates: DashboardEvent[] = [];

  if (user.participant) {
    try {
      // Use "all" so dashboard widgets include both upcoming and past joined events.
      const res = await fetchJSON(EP.PARTICIPANT.myReservations, {
        method: "POST",
        body: {
          perPage: 40,
          pageNumber: 1,
          reservationScope: "all",
        },
      });

      const joined = (res?.data ?? []).filter(
        (e: DashboardEvent) =>
          isDashboardJoinedReservation(e) && isUpcomingEvent(e)
      );
      candidates.push(...joined);
    } catch {
      /* optional */
    }
  }

  if (includeHosted) {
    try {
      const res = await fetchJSON(EP.COACH.myCreatedEvents, {
        method: "POST",
        body: { perPage: 40, pageNumber: 1 },
      });
      candidates.push(...(res?.data ?? []));
    } catch {
      /* optional */
    }
  }

  return dedupeUpcoming(candidates);
}

export function pickNextDashboardEvent(
  events: DashboardEvent[]
): DashboardEvent | null {
  if (events.length === 0) return null;
  return [...events].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )[0];
}

export function sortByCheckInOpens(events: DashboardEvent[]): DashboardEvent[] {
  return [...events]
    .filter((e) => getCheckInOpensAt(e))
    .sort((a, b) => {
      const aAt = new Date(getCheckInOpensAt(a)!).getTime();
      const bAt = new Date(getCheckInOpensAt(b)!).getTime();
      return aAt - bAt;
    })
    .slice(0, 8);
}
