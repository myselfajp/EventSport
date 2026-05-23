"use client";

import React, { useEffect, useState } from "react";
import {
  emptyLocationValue,
  fetchIstanbulDistricts,
  type LocationOption,
  type LocationValue,
} from "@/app/lib/location-api";

type LocationFieldsProps = {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  disabled?: boolean;
  showAddressLine?: boolean;
  addressLineLabel?: string;
  className?: string;
};

const LocationFields: React.FC<LocationFieldsProps> = ({
  value,
  onChange,
  disabled = false,
  showAddressLine = true,
  addressLineLabel = "Street / details (optional)",
  className = "",
}) => {
  const [districts, setDistricts] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const list = await fetchIstanbulDistricts();
        if (!cancelled) setDistricts(list);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectClass =
    "w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:bg-gray-700 dark:text-white disabled:opacity-50";

  return (
    <div className={`space-y-3 ${className}`}>
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
          Istanbul district (ilçe)
        </label>
        <select
          value={value.district}
          onChange={(e) => onChange({ ...value, district: e.target.value })}
          disabled={disabled || loading}
          className={selectClass}
        >
          <option value="">
            {loading ? "Loading..." : "Select district"}
          </option>
          {districts.map((d) => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
      {showAddressLine && (
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            {addressLineLabel}
          </label>
          <input
            type="text"
            value={value.addressLine}
            onChange={(e) => onChange({ ...value, addressLine: e.target.value })}
            disabled={disabled}
            placeholder="Building, street, etc."
            className={selectClass}
          />
        </div>
      )}
    </div>
  );
};

export { emptyLocationValue };
export default LocationFields;
