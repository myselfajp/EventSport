import { fetchJSON } from "@/app/lib/api";
import { EP } from "@/app/lib/endpoints";

export type LocationOption = {
  _id: string;
  name: string;
};

export type LocationValue = {
  district: string;
  addressLine: string;
};

export const emptyLocationValue = (): LocationValue => ({
  district: "",
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
