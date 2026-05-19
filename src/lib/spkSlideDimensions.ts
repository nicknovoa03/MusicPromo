import { Dimensions, PixelRatio } from "react-native";

/** Instagram portrait carousel (4:5 width:height). */
const SLIDE_ASPECT_WIDTH = 4;
const SLIDE_ASPECT_HEIGHT = 5;

export const SPK_SLIDE_WIDTH = PixelRatio.roundToNearestPixel(Dimensions.get("window").width);
export const SPK_SLIDE_HEIGHT = PixelRatio.roundToNearestPixel(
  (SPK_SLIDE_WIDTH * SLIDE_ASPECT_HEIGHT) / SLIDE_ASPECT_WIDTH,
);

export const SPK_CAPTURE_OPTIONS = {
  format: "jpg" as const,
  quality: 0.93,
  width: SPK_SLIDE_WIDTH,
  height: SPK_SLIDE_HEIGHT,
};
