import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export type LocationOption = {
  _id: string;
  name: string;
};

export type ProvinceOption = {
  slug: string;
  name: string;
};

export type StateOption = {
  code: string;
  name: string;
};

export type CountryOption = {
  code: string;
  name: string;
};

export type LocationValue = {
  country?: string;
  state?: string;
  stateCode?: string;
  city?: string;
  provinceSlug?: string;
  district: string;
  districtName?: string;
  postalCode?: string;
  addressLine: string;
};

export const emptyLocationValue = (): LocationValue => ({
  country: "TR",
  state: "",
  stateCode: "",
  city: "",
  provinceSlug: "",
  district: "",
  districtName: "",
  postalCode: "",
  addressLine: "",
});

export function buildLocationSearchPayload(loc: LocationValue) {
  const payload: Record<string, string> = {};
  if (loc.district) payload.district = loc.district;
  return payload;
}

export async function fetchIstanbulDistricts(): Promise<LocationOption[]> {
  const res = await fetchJSON(EP.LOCATION.districts, { method: "POST", body: {} });
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchCountries(): Promise<CountryOption[]> {
  const res = await fetchJSON(EP.LOCATION.countries, { method: "GET" }, { skipAuth: true });
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchTurkeyProvinces(): Promise<ProvinceOption[]> {
  const res = await fetchJSON(EP.LOCATION.trProvinces, { method: "GET" }, { skipAuth: true });
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchTurkeyDistricts(provinceSlug: string): Promise<string[]> {
  if (!provinceSlug) return [];
  const res = await fetchJSON(
    EP.LOCATION.trDistricts(provinceSlug),
    { method: "GET" },
    { skipAuth: true }
  );
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchUsStates(): Promise<StateOption[]> {
  const res = await fetchJSON(EP.LOCATION.usStates, { method: "GET" }, { skipAuth: true });
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export async function fetchUsCities(stateCode: string): Promise<string[]> {
  if (!stateCode) return [];
  const res = await fetchJSON(
    EP.LOCATION.usCities(stateCode),
    { method: "GET" },
    { skipAuth: true }
  );
  return res?.success && Array.isArray(res.data) ? res.data : [];
}

export type DetectedLocation = {
  countryCode: string;
  countryName?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  source?: string;
};

export async function detectLocation(): Promise<DetectedLocation | null> {
  const res = await fetchJSON(
    EP.LOCATION.detect,
    { method: "GET" },
    { skipAuth: true }
  );
  return res?.success && res.data ? (res.data as DetectedLocation) : null;
}
