/** Resolve an id suitable for GET /coach/get-by-detail/:id (coach or user id). */
export function resolveCoachProfileId(owner: unknown): string {
  if (!owner || typeof owner !== "object") return "";

  const o = owner as Record<string, unknown>;
  const coach = o.coach;

  if (coach) {
    if (typeof coach === "string") return coach;
    if (typeof coach === "object" && coach !== null && "_id" in coach) {
      return String((coach as { _id: unknown })._id);
    }
  }

  if (o._id) return String(o._id);
  return "";
}
