export const BETA_WATERMARK_TEXT = "MusicPromo beta";

export function isBetaWatermarkEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_BETA_WATERMARK;
  if (raw === undefined || raw === null) {
    return false;
  }

  const value = raw.trim().toLowerCase();
  if (!value) return false;
  return value === "1" || value === "true" || value === "yes" || value === "on";
}
