"use client";

import { useEffect, useState } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";
import {
  hasSeenWelcomePage,
  type WelcomePagePublicData,
} from "@/app/lib/welcome-page";
import WelcomePageOverlay from "@/components/welcome/WelcomePageOverlay";

export default function WelcomePageGate() {
  const [visible, setVisible] = useState(false);
  const [data, setData] = useState<WelcomePagePublicData | null>(null);

  useEffect(() => {
    if (hasSeenWelcomePage()) return;

    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetchJSON(
          EP.PUBLIC.welcomePage,
          { method: "GET" },
          { skipAuth: true }
        );
        if (cancelled) return;
        if (res?.success && res.data) {
          setData(res.data as WelcomePagePublicData);
          setVisible(true);
        }
      } catch {
        /* welcome page is optional */
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible || !data) return null;

  return <WelcomePageOverlay data={data} onDismiss={() => setVisible(false)} />;
}
