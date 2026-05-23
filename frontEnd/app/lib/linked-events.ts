import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export type LinkedEvent = {
  _id: string;
  name: string;
  startTime: string;
  endTime: string;
  createdAt?: string;
  sport?: { _id?: string; name?: string };
  sportGroup?: { _id?: string; name?: string };
  eventStyle?: { name?: string; color?: string };
  facility?: { _id?: string; name?: string };
  club?: { _id?: string; name?: string };
  group?: { _id?: string; name?: string };
  owner?: { _id?: string; firstName?: string; lastName?: string; coach?: string };
};

export type EventFilterKey = "facility" | "club" | "group";

export async function fetchLinkedEvents(
  filterKey: EventFilterKey,
  filterId: string
): Promise<{ events: LinkedEvent[]; total: number; error?: string }> {
  if (!filterId) {
    return { events: [], total: 0 };
  }

  try {
    const all: LinkedEvent[] = [];
    let page = 1;
    let totalPages = 1;
    let total = 0;
    const perPage = 50;

    do {
      const response = await fetchJSON(EP.EVENTS.getEvents, {
        method: "POST",
        body: {
          [filterKey]: filterId,
          perPage,
          pageNumber: page,
          sortBy: "startTime",
          sortType: "desc",
        },
      });

      if (!response?.success) {
        const empty =
          page === 1 &&
          (response?.message === "No results found" ||
            String(response?.message || "").toLowerCase().includes("no results"));
        if (empty) {
          return { events: [], total: 0 };
        }
        return {
          events: [],
          total: 0,
          error: response?.message || response?.error || "Failed to load events",
        };
      }

      const batch = Array.isArray(response.data)
        ? (response.data as LinkedEvent[])
        : [];
      all.push(...batch);
      total = response.pagination?.total ?? all.length;
      totalPages = response.pagination?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages && page <= 20);

    return { events: all, total };
  } catch (err: unknown) {
    return {
      events: [],
      total: 0,
      error: err instanceof Error ? err.message : "Failed to load events",
    };
  }
}
