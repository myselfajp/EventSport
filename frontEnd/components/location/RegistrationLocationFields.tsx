"use client";

import React, { useEffect, useRef, useState } from "react";
import { detectLocation, type LocationValue } from "@/app/lib/location-api";
import CascadingLocationFields, {
  normalizeCountry,
} from "@/components/location/CascadingLocationFields";

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
};

export default function RegistrationLocationFields({ value, onChange }: Props) {
  const [detecting, setDetecting] = useState(true);
  const [detectedLabel, setDetectedLabel] = useState("");
  const valueRef = useRef(value);
  valueRef.current = value;

  // Auto-detect country once on mount (best-effort, defaults to Türkiye).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDetecting(true);
      try {
        const detected = await detectLocation();
        if (cancelled) return;
        const nextCountry = normalizeCountry(detected?.countryCode);
        onChange({
          ...valueRef.current,
          country: nextCountry,
          state: nextCountry === "US" ? detected?.state || "" : "",
          stateCode: "",
          city: nextCountry === "US" ? detected?.city || "" : "",
          provinceSlug: "",
          district: "",
          districtName: "",
          postalCode: nextCountry === "US" ? detected?.postalCode || "" : "",
        });
        setDetectedLabel(nextCountry === "US" ? "United States" : "Türkiye");
      } catch {
        if (!cancelled) setDetectedLabel("Türkiye");
      } finally {
        if (!cancelled) setDetecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const note = detecting
    ? "Detecting your location..."
    : detectedLabel
      ? `Detected as ${detectedLabel}. Change it if needed.`
      : "You can change this if needed.";

  return <CascadingLocationFields value={value} onChange={onChange} note={note} />;
}
