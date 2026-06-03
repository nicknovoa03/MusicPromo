import { Dimensions, PixelRatio } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import { FLYER_CONTENT_SCALE } from "@/lib/flyerLayout";

/** On-screen flyer previews always use 4:5; export can still target 9:16 or 4:5. */
export const FLYER_PREVIEW_ASPECT_RATIO: FlyerAspectRatio = "4:5";

const PREVIEW_BASE_MAX_WIDTH_EDITOR = 220;
const PREVIEW_BASE_MAX_WIDTH_EXPORT = 180;
const PREVIEW_BASE_MAX_HEIGHT_RATIO = 0.34;

export const FLYER_PREVIEW_MAX_WIDTH_EDITOR = Math.round(
  PREVIEW_BASE_MAX_WIDTH_EDITOR * FLYER_CONTENT_SCALE,
);
export const FLYER_PREVIEW_MAX_WIDTH_EXPORT = Math.round(
  PREVIEW_BASE_MAX_WIDTH_EXPORT * FLYER_CONTENT_SCALE,
);

export function flyerPreviewMaxHeight(windowHeight: number): number {
  return Math.round(windowHeight * PREVIEW_BASE_MAX_HEIGHT_RATIO * FLYER_CONTENT_SCALE);
}

const BASE_WIDTH = PixelRatio.roundToNearestPixel(Dimensions.get("window").width);

export function flyerExportSize(aspectRatio: FlyerAspectRatio): {
  width: number;
  height: number;
} {
  const width = BASE_WIDTH;
  const height =
    aspectRatio === "4:5"
      ? PixelRatio.roundToNearestPixel((width * 5) / 4)
      : PixelRatio.roundToNearestPixel((width * 16) / 9);
  return { width, height };
}

export const FLYER_CAPTURE_QUALITY = 0.93;

export function previewSize(
  aspectRatio: FlyerAspectRatio,
  maxWidth: number,
): { width: number; height: number } {
  const { width: exportW, height: exportH } = flyerExportSize(aspectRatio);
  const scale = maxWidth / exportW;
  return {
    width: maxWidth,
    height: Math.round(exportH * scale),
  };
}

/** Preview that fits within width and optional max height (for export screen layout). */
export function previewSizeForDisplay(
  aspectRatio: FlyerAspectRatio,
  maxWidth: number,
  maxHeight?: number,
): { width: number; height: number } {
  const base = previewSize(aspectRatio, maxWidth);
  if (!maxHeight || base.height <= maxHeight) return base;
  const scale = maxHeight / base.height;
  return {
    width: Math.round(base.width * scale),
    height: Math.round(base.height * scale),
  };
}
