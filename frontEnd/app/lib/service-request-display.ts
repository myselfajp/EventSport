type ServiceRequestAnswer = {
  key: string;
  question: string;
  answer: string;
};

export function getServiceRequestAnswer(
  answers: ServiceRequestAnswer[] | undefined,
  key: string
): string {
  const row = answers?.find((item) => item.key === key);
  if (!row?.answer) return "";
  if (Array.isArray(row.answer)) return row.answer.join(", ");
  return String(row.answer);
}

export function formatServiceRequestDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export function formatServiceRequestLocation(
  answers: ServiceRequestAnswer[] | undefined
): string {
  const raw = getServiceRequestAnswer(answers, "location");
  if (!raw) return "—";
  return raw.replace(/\s*\/\s*/g, " · ");
}

export function serviceRequestDetailPreview(
  answers: ServiceRequestAnswer[] | undefined,
  fallback = "—"
): string {
  const goal = getServiceRequestAnswer(answers, "sportsGoal");
  const details = getServiceRequestAnswer(answers, "additionalDetails");
  const sport = getServiceRequestAnswer(answers, "sportGroupBranch");
  const combined = [sport, goal, details].filter(Boolean).join(" · ");
  if (!combined) return fallback;
  return combined.length > 140 ? `${combined.slice(0, 137)}…` : combined;
}
