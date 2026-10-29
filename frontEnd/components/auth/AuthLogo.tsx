"use client";

import React, { useState, useEffect } from "react";
import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export default function AuthLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoDarkUrl, setLogoDarkUrl] = useState<string | null>(null);
  const [logoAlt, setLogoAlt] = useState("EventSport");

  useEffect(() => {
    let cancelled = false;
    void fetchJSON(
      EP.PUBLIC.dashboardHeaderLogo,
      { method: "GET" },
      { skipAuth: true }
    ).then((res) => {
      if (cancelled || !res?.success) return;
      if (res.data?.image?.path) {
        setLogoUrl(EP.assetUrl(res.data.image.path));
      }
      if (res.data?.imageDark?.path) {
        setLogoDarkUrl(EP.assetUrl(res.data.imageDark.path));
      }
      setLogoAlt(res.data?.imageAlt || "EventSport");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnyLogo = logoUrl || logoDarkUrl;

  return (
    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 p-2 overflow-hidden">
      {hasAnyLogo ? (
        <>
          {logoDarkUrl && logoUrl ? (
            <>
              <img
                src={logoUrl}
                alt={logoAlt}
                className="w-full h-full object-contain select-none pointer-events-none dark:hidden block"
              />
              <img
                src={logoDarkUrl}
                alt={logoAlt}
                className="w-full h-full object-contain select-none pointer-events-none hidden dark:block"
              />
            </>
          ) : (
            <img
              src={logoUrl || logoDarkUrl || ""}
              alt={logoAlt}
              className="w-full h-full object-contain select-none pointer-events-none"
            />
          )}
        </>
      ) : (
        <div className="w-full h-full rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
          ES
        </div>
      )}
    </div>
  );
}
