export const BETA_WATERMARK_TEXT = "MusicPromo beta";

export function isBetaWatermarkEnabled(): boolean {
  const value = process.env.EXPO_PUBLIC_BETA_WATERMARK?.trim().toLowerCase();
  return value === "1" || value === "true";
}
