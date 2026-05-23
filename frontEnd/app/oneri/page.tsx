import { redirect } from "next/navigation";

/** @deprecated Use `/feedback` — kept for bookmarks. */
export default function OneriLegacyRedirect() {
  redirect("/feedback");
}
