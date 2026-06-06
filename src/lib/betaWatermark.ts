export const BETA_WATERMARK_TEXT = "MusicPromo beta";

/** Shared with preview (`BetaWatermark`) and FFmpeg export overlay. */
export const WATERMARK_WIDTH_RATIO = 0.13;
export const WATERMARK_INSET_MIN_PX = 4;
export const WATERMARK_INSET_WIDTH_RATIO = 0.015;

export function resolveWatermarkInsetPx(frameWidth: number): number {
  return Math.max(
    WATERMARK_INSET_MIN_PX,
    Math.round(frameWidth * WATERMARK_INSET_WIDTH_RATIO),
  );
}

export function resolveWatermarkLogoWidthPx(
  frameWidth: number,
  options?: { clampForSmallPreview?: boolean },
): number {
  const raw = Math.round(frameWidth * WATERMARK_WIDTH_RATIO);
  if (options?.clampForSmallPreview) {
    return Math.max(28, Math.min(48, raw));
  }
  return raw;
}

export function isBetaWatermarkEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_BETA_WATERMARK;
  if (raw === undefined || raw === null) {
    return false;
  }

  const value = raw.trim().toLowerCase();
  if (!value) return false;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
