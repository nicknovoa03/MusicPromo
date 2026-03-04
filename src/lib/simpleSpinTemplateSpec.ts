export type SimpleSpinAspectRatio = "9:16" | "1:1";

export interface SimpleSpinTemplateLayout {
  discSize: number;
  discRadius: number;
  labelRadius: number;
  holeRadius: number;
  discX: number;
  discY: number;
  glowSize: number;
  glowRadius: number;
  glowX: number;
  glowY: number;
}

export const SIMPLE_SPIN_STAGE_BACKGROUND_HEX = "#000000";
export const SIMPLE_SPIN_GLOW_HEX = "#ffffff";
export const SIMPLE_SPIN_GLOW_ALPHA_BYTE = 34;

function toEven(value: number) {
  return value % 2 === 0 ? value : value - 1;
}

export function getSimpleSpinTemplateLayout(params: {
  width: number;
  height: number;
  aspectRatio: SimpleSpinAspectRatio;
}): SimpleSpinTemplateLayout {
  const { width, height, aspectRatio } = params;
  const basis = Math.min(width, height);
  const discScale = aspectRatio === "9:16" ? 0.82 : 0.78;
  const discSize = Math.max(120, toEven(Math.round(basis * discScale)));
  const discRadius = Math.round(discSize / 2);
  const labelRadius = Math.max(28, Math.round(discSize * 0.3));
  const holeRadius = Math.max(10, Math.round(discSize * 0.065));
  const discX = Math.round((width - discSize) / 2);
  const discY = Math.round(
    (height - discSize) / 2 - (aspectRatio === "9:16" ? height * 0.02 : 0),
  );
  const glowSize = Math.max(toEven(Math.round(discSize * 1.08)), discSize + 8);
  const glowRadius = Math.round(glowSize / 2);
  const glowX = Math.round((width - glowSize) / 2);
  const glowY = Math.round(
    (height - glowSize) / 2 - (aspectRatio === "9:16" ? height * 0.02 : 0),
  );

  return {
    discSize,
    discRadius,
    labelRadius,
    holeRadius,
    discX,
    discY,
    glowSize,
    glowRadius,
    glowX,
    glowY,
  };
}
