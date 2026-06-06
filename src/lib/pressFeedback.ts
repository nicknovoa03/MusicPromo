import type { StyleProp, ViewStyle } from "react-native";

/** Primary CTAs and cards — matches AudioTrimmer / share screen. */
export const PRESS_SCALE_PRIMARY = 0.97;

/** Header icon buttons and secondary actions. */
export const PRESS_SCALE_SUBTLE = 0.98;

export function pressScaleStyle(
  pressed: boolean,
  scale: number = PRESS_SCALE_PRIMARY,
): StyleProp<ViewStyle> {
  return pressed ? { transform: [{ scale }] } : undefined;
}
