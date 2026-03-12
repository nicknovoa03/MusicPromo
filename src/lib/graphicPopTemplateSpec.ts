import {
  getSimpleSpinTemplateLayout,
  type SimpleSpinAspectRatio,
  type SimpleSpinTemplateLayout,
} from "@/lib/simpleSpinTemplateSpec";

export const GRAPHIC_POP_STAGE_BACKGROUND_HEX = "#000000";
export const GRAPHIC_POP_GLOW_HEX = "#eef2f7";
export const GRAPHIC_POP_GLOW_ALPHA_BYTE = 0;
export const GRAPHIC_POP_AMBIENT_GLOW_HEX = "#a9b4c1";
export const GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE = 0;
export const GRAPHIC_POP_CENTER_RING_HEX = "#f5f7fb";
export const GRAPHIC_POP_CENTER_RING_ALPHA_BYTE = 76;
export const GRAPHIC_POP_CENTER_SHADOW_HEX = "#06080d";
export const GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE = 38;

export function getGraphicPopTemplateLayout(params: {
  width: number;
  height: number;
  aspectRatio: SimpleSpinAspectRatio;
}): SimpleSpinTemplateLayout {
  // Keep the same geometric structure as simple-spin for now.
  return getSimpleSpinTemplateLayout(params);
}
