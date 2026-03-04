import {
  getSimpleSpinTemplateLayout,
  type SimpleSpinAspectRatio,
  type SimpleSpinTemplateLayout,
} from "@/lib/simpleSpinTemplateSpec";

export const GRAPHIC_POP_STAGE_BACKGROUND_HEX = "#07080a";
export const GRAPHIC_POP_GLOW_HEX = "#eef2f7";
export const GRAPHIC_POP_GLOW_ALPHA_BYTE = 0;
export const GRAPHIC_POP_AMBIENT_GLOW_HEX = "#a9b4c1";
export const GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE = 0;

export function getGraphicPopTemplateLayout(params: {
  width: number;
  height: number;
  aspectRatio: SimpleSpinAspectRatio;
}): SimpleSpinTemplateLayout {
  // Keep the same geometric structure as simple-spin for now.
  return getSimpleSpinTemplateLayout(params);
}
