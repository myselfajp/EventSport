"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  fetchTurkeyProvinces,
  fetchTurkeyDistricts,
  fetchUsStates,
  fetchUsCities,
  type ProvinceOption,
  type StateOption,
  type LocationValue,
} from "@/app/lib/location-api";

type Props = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  disabled?: boolean;
  /** Optional note rendered under the country selector (e.g. detection hint). */
  note?: React.ReactNode;
  /** When false, postal / ZIP fields are hidden (e.g. event creation). */
  showPostalCode?: boolean;
};

const COUNTRY_OPTIONS = [
  { code: "TR", label: "Türkiye" },
  { code: "US", label: "United States" },
];

export function normalizeCountry(code?: string) {
  return String(code || "TR").trim().toUpperCase() === "US" ? "US" : "TR";
}

const inputClass =
  "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 dark:focus:border-cyan-400 transition-colors disabled:opacity-50";

const labelClass =
  "block text-xs font-medium text-gray-600 dark:text-slate-400 mb-1";

export default function CascadingLocationFields({
  value,
  onChange,
  disabled = false,
  note,
  showPostalCode = true,
}: Props) {
  const [provinces, setProvinces] = useState<ProvinceOption[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [states, setStates] = useState<StateOption[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(false);

  const country = normalizeCountry(value.country);
  const citiesListId = useId();
  // Keep a live ref of value so derive effects can patch without stale closures.
  const valueRef = useRef(value);
  valueRef.current = value;

  const patch = (next: Partial<LocationValue>) =>
    onChange({ ...valueRef.current, ...next });

  // Load reference lists per country.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (country === "TR") {
        const list = await fetchTurkeyProvinces();
        if (!cancelled) setProvinces(list);
      } else {
        const list = await fetchUsStates();
        if (!cancelled) setStates(list);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  // Derive provinceSlug from a stored province name (edit prefill).
  useEffect(() => {
    if (country !== "TR" || provinces.length === 0) return;
    const v = valueRef.current;
    if (v.provinceSlug || !v.city) return;
    const match = provinces.find((p) => p.name === v.city);
    if (match) patch({ provinceSlug: match.slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, provinces]);

  // Derive stateCode from a stored state name (edit prefill).
  useEffect(() => {
    if (country !== "US" || states.length === 0) return;
    const v = valueRef.current;
    if (v.stateCode || !v.state) return;
    const match = states.find((s) => s.name === v.state);
    if (match) patch({ stateCode: match.code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, states]);

  // Load TR districts when province changes.
  useEffect(() => {
    if (country !== "TR" || !value.provinceSlug) {
      setDistricts([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setDistrictsLoading(true);
      try {
        const list = await fetchTurkeyDistricts(value.provinceSlug || "");
        if (!cancelled) setDistricts(list);
      } finally {
        if (!cancelled) setDistrictsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country, value.provinceSlug]);

  // Load US city suggestions when state changes.
  useEffect(() => {
    if (country !== "US" || !value.stateCode) {
      setCities([]);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      const list = await fetchUsCities(value.stateCode || "");
      if (!cancelled) setCities(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [country, value.stateCode]);

  const handleCountryChange = (nextCountry: string) => {
    patch({
      country: normalizeCountry(nextCountry),
      state: "",
      stateCode: "",
      city: "",
      provinceSlug: "",
      district: "",
      districtName: "",
      postalCode: "",
    });
  };

  const handleProvinceChange = (slug: string) => {
    const province = provinces.find((p) => p.slug === slug);
    patch({
      provinceSlug: slug,
      city: province?.name || "",
      district: "",
      districtName: "",
    });
  };

  const handleStateChange = (code: string) => {
    const state = states.find((s) => s.code === code);
    patch({ stateCode: code, state: state?.name || "", city: "" });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Country</label>
        <select
          value={country}
          onChange={(e) => handleCountryChange(e.target.value)}
          disabled={disabled}
          className={inputClass}
        >
          {COUNTRY_OPTIONS.map((item) => (
            <option key={item.code} value={item.code}>
              {item.label}
            </option>
          ))}
        </select>
        {note ? (
          <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{note}</p>
        ) : null}
      </div>

      {country === "TR" ? (
        <>
          <div>
            <label className={labelClass}>Şehir (İl)</label>
            <select
              value={value.provinceSlug || ""}
              onChange={(e) => handleProvinceChange(e.target.value)}
              disabled={disabled}
              className={inputClass}
              required
            >
              <option value="">Şehir seçin</option>
              {provinces.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Semt / İlçe</label>
            <select
              value={value.districtName || ""}
              onChange={(e) => patch({ districtName: e.target.value })}
              disabled={disabled || !value.provinceSlug || districtsLoading}
              className={inputClass}
              required
            >
              <option value="">
                {!value.provinceSlug
                  ? "Önce şehir seçin"
                  : districtsLoading
                    ? "Yükleniyor..."
                    : "İlçe seçin"}
              </option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          {showPostalCode ? (
            <div>
              <label className={labelClass}>Posta Kodu</label>
              <input
                type="text"
                inputMode="numeric"
                value={value.postalCode || ""}
                onChange={(e) => patch({ postalCode: e.target.value })}
                disabled={disabled}
                placeholder="34000"
                className={inputClass}
                required
              />
            </div>
          ) : null}
        </>
      ) : (
        <>
          <div>
            <label className={labelClass}>State</label>
            <select
              value={value.stateCode || ""}
              onChange={(e) => handleStateChange(e.target.value)}
              disabled={disabled}
              className={inputClass}
              required
            >
              <option value="">Select a state</option>
              {states.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>City</label>
            <input
              type="text"
              list={citiesListId}
              value={value.city || ""}
              onChange={(e) => patch({ city: e.target.value })}
              disabled={disabled || !value.stateCode}
              placeholder={value.stateCode ? "Start typing or pick a city" : "Select a state first"}
              className={inputClass}
              required
            />
            <datalist id={citiesListId}>
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          {showPostalCode ? (
            <div>
              <label className={labelClass}>ZIP Code</label>
              <input
                type="text"
                inputMode="numeric"
                value={value.postalCode || ""}
                onChange={(e) => patch({ postalCode: e.target.value })}
                disabled={disabled}
                placeholder="90001"
                className={inputClass}
                required
              />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
