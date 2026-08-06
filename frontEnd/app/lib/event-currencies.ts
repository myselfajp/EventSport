export const EVENT_CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "TRY", label: "TRY — Turkish Lira" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "GBP", label: "GBP — British Pound" },
  { code: "CHF", label: "CHF — Swiss Franc" },
  { code: "JPY", label: "JPY — Japanese Yen" },
  { code: "CAD", label: "CAD — Canadian Dollar" },
  { code: "AUD", label: "AUD — Australian Dollar" },
  { code: "SAR", label: "SAR — Saudi Riyal" },
  { code: "AED", label: "AED — UAE Dirham" },
] as const;

export type EventCurrencyCode = (typeof EVENT_CURRENCIES)[number]["code"];

export const DEFAULT_EVENT_CURRENCY: EventCurrencyCode = "USD";

export function formatEventFee(
  amount?: number | null,
  currency?: string | null
): string {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const code = (currency || DEFAULT_EVENT_CURRENCY).toUpperCase();
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
      maximumFractionDigits: code === "JPY" ? 0 : 2,
    }).format(Number(amount));
  } catch {
    return `${Number(amount)} ${code}`;
  }
}
