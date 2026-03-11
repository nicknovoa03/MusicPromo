export const BETA_WATERMARK_TEXT = "MusicPromo beta";

export function isBetaWatermarkEnabled(): boolean {
  return process.env.EXPO_PUBLIC_BETA_WATERMARK !== "0";
}
