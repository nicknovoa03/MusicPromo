export const BETA_WATERMARK_TEXT = "MusicPromo beta";

export function isBetaWatermarkEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_BETA_WATERMARK;
  if (raw === undefined || raw === null) {
    return true;
  }

  const value = raw.trim().toLowerCase();
  if (!value) return true;
  if (value === "0" || value === "false" || value === "off" || value === "no") {
    return false;
  }

  return true;
}
