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
  ambientGlowSize: number;
  ambientGlowRadius: number;
  ambientGlowX: number;
  ambientGlowY: number;
}

export interface CenterTextureSpec {
  ringRadius: number;
  ringThickness: number;
  ringInnerRadius: number;
  shadowOuterRadius: number;
  shadowInnerRadius: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export const SIMPLE_SPIN_STAGE_BACKGROUND_HEX = "#04070d";
export const SIMPLE_SPIN_GLOW_HEX = "#95bbff";
export const SIMPLE_SPIN_GLOW_ALPHA_BYTE = 0;
export const SIMPLE_SPIN_AMBIENT_GLOW_HEX = "#3f6aa8";
export const SIMPLE_SPIN_AMBIENT_GLOW_ALPHA_BYTE = 0;

function toEven(value: number) {
  return value % 2 === 0 ? value : value - 1;
}

export function getCenterTextureSpec(discSize: number): CenterTextureSpec {
  const safeDiscSize = Math.max(Math.round(discSize), 1);
  const discRadius = Math.round(safeDiscSize / 2);
  const ringRadius = Math.max(Math.round(discRadius * 0.2), 7);
  const ringThickness = Math.max(Math.round(safeDiscSize * 0.006), 1);
  const ringInnerRadius = Math.max(ringRadius - ringThickness, 1);
  const shadowOuterRadius = Math.max(
    ringRadius + Math.round(safeDiscSize * 0.012),
    ringRadius + 2,
  );
  const shadowInnerRadius = Math.max(
    ringRadius - Math.round(safeDiscSize * 0.003),
    1,
  );
  const shadowOffsetY = Math.max(Math.round(safeDiscSize * 0.006), 1);
  const shadowOffsetX = 0;

  return {
    ringRadius,
    ringThickness,
    ringInnerRadius,
    shadowOuterRadius,
    shadowInnerRadius,
    shadowOffsetX,
    shadowOffsetY,
  };
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
  const ambientGlowSize = Math.max(
    toEven(Math.round(discSize * 1.5)),
    glowSize + 28,
  );
  const ambientGlowRadius = Math.round(ambientGlowSize / 2);
  const ambientGlowX = Math.round((width - ambientGlowSize) / 2);
  const ambientGlowY = Math.round(
    glowY - Math.min(Math.round(height * 0.08), Math.round(discSize * 0.2)),
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
    ambientGlowSize,
    ambientGlowRadius,
    ambientGlowX,
    ambientGlowY,
  };
}
