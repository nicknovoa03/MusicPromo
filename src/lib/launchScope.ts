/**
 * App Store v1 launch scope.
 *
 * Default: Music Promo video only (SPK + Show Flyer hidden).
 * Set EXPO_PUBLIC_LAUNCH_SCOPE=full in .env or EAS env to re-enable all project types.
 */
export type LaunchScope = "music-promo-only" | "full";

function resolveLaunchScope(): LaunchScope {
  const raw = process.env.EXPO_PUBLIC_LAUNCH_SCOPE?.trim().toLowerCase();
  if (raw === "full" || raw === "all") return "full";
  return "music-promo-only";
}

export const LAUNCH_SCOPE: LaunchScope = resolveLaunchScope();

export function isMusicPromoOnlyLaunch(): boolean {
  return LAUNCH_SCOPE === "music-promo-only";
}

export const MUSIC_PROMO_CREATE_ROUTE = "/create/picker" as const;

export function isExtendedProjectType(
  type: string | null | undefined,
): type is "spk" | "flyer" {
  return type === "spk" || type === "flyer";
}

/** Video promos and legacy rows without `type` stay visible on Home. */
export function isMusicPromoVideoProject(project: {
  type?: string | null;
}): boolean {
  const type = project.type;
  if (!type || type === "video") return true;
  return !isExtendedProjectType(type);
}

export function filterProjectsForLaunchScope<T extends { type?: string | null }>(
  projects: T[],
): T[] {
  if (!isMusicPromoOnlyLaunch()) return projects;
  return projects.filter(isMusicPromoVideoProject);
}
