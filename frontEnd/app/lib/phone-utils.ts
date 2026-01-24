export const PHONE_PREFIX = "+90 5";
export const PHONE_DIGITS_LENGTH = 9;

export function processPhoneInput(raw: string): string {
  const numeric = raw.replace(/\D/g, "");
  const afterPrefix = numeric.replace(/^90?5?/, "").slice(0, PHONE_DIGITS_LENGTH);
  return PHONE_PREFIX + afterPrefix;
}

export function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "").replace(/^90?5?/, "");
}

export function normalizePhoneForDisplay(phone: string | undefined): string {
  if (!phone || !phone.trim()) return PHONE_PREFIX;
  const numeric = phone.replace(/\D/g, "");
  const after = numeric.replace(/^90?5?/, "").slice(0, PHONE_DIGITS_LENGTH);
  return PHONE_PREFIX + after;
}

export function isPhoneComplete(phone: string): boolean {
  return getPhoneDigits(phone).length >= PHONE_DIGITS_LENGTH;
}
