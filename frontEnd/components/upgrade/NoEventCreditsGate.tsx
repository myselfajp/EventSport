"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import NoEventCreditsModal from "./NoEventCreditsModal";
import { NO_EVENT_CREDITS_EVENT } from "@/app/lib/subscription-credits";

export default function NoEventCreditsGate() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(NO_EVENT_CREDITS_EVENT, handler);
    return () => window.removeEventListener(NO_EVENT_CREDITS_EVENT, handler);
  }, []);

  return (
    <NoEventCreditsModal
      isOpen={open}
      onClose={() => setOpen(false)}
      onUpgrade={() => {
        setOpen(false);
        router.push("/upgrade");
      }}
    />
  );
}
