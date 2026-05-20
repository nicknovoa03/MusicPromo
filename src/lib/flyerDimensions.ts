import { Dimensions, PixelRatio } from "react-native";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";

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
