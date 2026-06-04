import { EP } from "@/app/lib/endpoints";

type SportImageMeta = {
  path?: string;
} | null | undefined;

export function resolveCoachBadgeUrl(
  coachBadge?: SportImageMeta,
  sportIcon?: SportImageMeta
): string {
  if (coachBadge?.path) {
    return EP.assetUrl(coachBadge.path);
  }
  if (sportIcon?.path) {
    return EP.assetUrl(sportIcon.path);
  }
  return "/assets/coach-badge.png";
}

export function primaryBranchCoachBadgeUrl(
  branches: Array<{
    branchOrder?: number;
    sportCoachBadge?: SportImageMeta;
    sportIcon?: SportImageMeta;
  }> | null | undefined
): string {
  if (!branches?.length) {
    return "/assets/coach-badge.png";
  }
  const primary =
    branches.find((b) => b.branchOrder === 1) ?? branches[0];
  return resolveCoachBadgeUrl(primary.sportCoachBadge, primary.sportIcon);
}
