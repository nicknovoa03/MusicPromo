export type VinylShellSize = "small" | "normal" | "large";

const VINYL_SHELL_ARTWORK_SCALE_OPTIONS = [1.5, 3, 4.5] as const;
const VINYL_SHELL_SIZE_BY_INDEX: readonly VinylShellSize[] = [
  "small",
  "normal",
  "large",
];

export const DEFAULT_VINYL_SHELL_SIZE: VinylShellSize = "normal";

export const VINYL_SHELL_ASSET_MODULES: Record<VinylShellSize, number> = {
  small: require("../../assets/vinyl_shell_small.png"),
  normal: require("../../assets/vinyl_shell_normal.png"),
  large: require("../../assets/vinyl_shell_large.png"),
};

export function resolveVinylShellSizeFromArtworkScale(
  artworkScale: number,
): VinylShellSize {
  if (!Number.isFinite(artworkScale)) {
    return DEFAULT_VINYL_SHELL_SIZE;
  }

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < VINYL_SHELL_ARTWORK_SCALE_OPTIONS.length; index += 1) {
    const option = VINYL_SHELL_ARTWORK_SCALE_OPTIONS[index];
    const distance = Math.abs(artworkScale - option);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }

  return VINYL_SHELL_SIZE_BY_INDEX[closestIndex] ?? DEFAULT_VINYL_SHELL_SIZE;
}

export function getVinylShellFallbackOrder(
  preferredSize: VinylShellSize,
): VinylShellSize[] {
  if (preferredSize === DEFAULT_VINYL_SHELL_SIZE) {
    return [preferredSize];
  }

  return [preferredSize, DEFAULT_VINYL_SHELL_SIZE];
}
