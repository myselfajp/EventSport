"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import ViewEventModal from "@/components/event/ViewEventModal";
import { useCoachProfileModal } from "@/app/hooks/useCoachProfileModal";

type ViewEventModalEvent = NonNullable<
  React.ComponentProps<typeof ViewEventModal>["event"]
>;

function clearEventQueryParam(router: ReturnType<typeof useRouter>) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.delete("event");
  const next =
    url.pathname + (url.search ? url.search : "") + (url.hash ?? "");
  router.replace(next, { scroll: false });
}

function NotificationEventLinkHandlerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("event");
  const [event, setEvent] = useState<ViewEventModalEvent | null>(null);
  const [open, setOpen] = useState(false);
  const { onCoachClick, coachProfileModal } = useCoachProfileModal();

  useEffect(() => {
    if (!eventId) {
      setOpen(false);
      setEvent(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetchJSON(EP.EVENTS.getEventById(eventId), {
          method: "POST",
        });
        if (cancelled) return;
        if (res?.success && res?.data) {
          setEvent(res.data as ViewEventModalEvent);
          setOpen(true);
        } else {
          setEvent(null);
          setOpen(false);
        }
      } catch {
        if (!cancelled) {
          setEvent(null);
          setOpen(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <>
      <ViewEventModal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEvent(null);
          clearEventQueryParam(router);
        }}
        event={event}
        onCoachClick={onCoachClick}
      />
      {coachProfileModal}
    </>
  );
}

const NotificationEventLinkHandler: React.FC = () => (
  <Suspense fallback={null}>
    <NotificationEventLinkHandlerInner />
  </Suspense>
);

export default NotificationEventLinkHandler;
