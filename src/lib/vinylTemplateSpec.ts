export type VinylToneId = "simple-spin" | "graphic-pop";

export interface VinylToneSpec {
  id: VinylToneId;
  shadeHexColor: string;
  shadeAlphaByte: number;
  labelHexColor: string;
  labelAlphaByte: number;
  holeHexColor: string;
  holeAlphaByte: number;
  showGroovesInPreview: boolean;
  showSheenInPreview: boolean;
  showCenterTextureInPreview: boolean;
}

interface VinylCenterRatioSpec {
  labelDiameterRatio: number;
  holeDiameterRatio: number;
}

interface VinylEdgeSpec {
  outerRimWidthRatio: number;
  outerRimMinWidth: number;
  outerRimHexColor: string;
  outerRimAlphaByte: number;
  innerRimDiameterRatio: number;
  innerRimThickness: number;
  innerRimHexColor: string;
  innerRimAlphaByte: number;
}

const VINYL_TONES: Record<VinylToneId, VinylToneSpec> = {
  "simple-spin": {
    id: "simple-spin",
    shadeHexColor: "#c2cee4",
    shadeAlphaByte: 0,
    labelHexColor: "#f9fbff",
    labelAlphaByte: 118,
    holeHexColor: "#0a0e16",
    holeAlphaByte: 232,
    showGroovesInPreview: false,
    showSheenInPreview: false,
    showCenterTextureInPreview: false,
  },
  "graphic-pop": {
    id: "graphic-pop",
    shadeHexColor: "#d2d8e0",
    shadeAlphaByte: 0,
    labelHexColor: "#f3f5f8",
    labelAlphaByte: 54,
    holeHexColor: "#11141a",
    holeAlphaByte: 228,
    showGroovesInPreview: false,
    showSheenInPreview: false,
    showCenterTextureInPreview: false,
  },
};

const VINYL_CENTER_RATIO_SPECS: Record<VinylToneId, VinylCenterRatioSpec> = {
  "simple-spin": {
    labelDiameterRatio: 0.36,
    holeDiameterRatio: 0.13,
  },
  "graphic-pop": {
    labelDiameterRatio: 0.19,
    holeDiameterRatio: 0.068,
  },
};

const VINYL_EDGE_SPEC: VinylEdgeSpec = {
  outerRimWidthRatio: 0.017,
  outerRimMinWidth: 1.2,
  outerRimHexColor: "#0a0e16",
  outerRimAlphaByte: 97,
  innerRimDiameterRatio: 0.955,
  innerRimThickness: 1,
  innerRimHexColor: "#ffffff",
  innerRimAlphaByte: 36,
};

function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 255) return 255;
  return Math.round(value);
}

function parseHexColor(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color "${hex}" in vinyl template spec.`);
  }
  const r = Number.parseInt(normalized.slice(0, 2), 16);
  const g = Number.parseInt(normalized.slice(2, 4), 16);
  const b = Number.parseInt(normalized.slice(4, 6), 16);
  return { r, g, b };
}

export function alphaByteToUnit(alphaByte: number): number {
  return clampByte(alphaByte) / 255;
}

export function toFfmpegColor(hex: string, alphaByte: number): string {
  return `${hex}@${alphaByteToUnit(alphaByte).toFixed(3)}`;
}

export function toRgba(hex: string, alphaByte: number): string {
  const { r, g, b } = parseHexColor(hex);
  const alpha = alphaByteToUnit(alphaByte);
  return `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
}

export function getVinylToneSpec(tone: VinylToneId): VinylToneSpec {
  return VINYL_TONES[tone];
}

export function getVinylCenterGeometry(tone: VinylToneId, discSize: number): {
  labelDiameter: number;
  labelRadius: number;
  holeDiameter: number;
  holeRadius: number;
} {
  const safeDiscSize = Math.max(Math.round(discSize), 1);
  const ratios = VINYL_CENTER_RATIO_SPECS[tone];
  const labelDiameter = Math.max(
    Math.round(safeDiscSize * ratios.labelDiameterRatio),
    1,
  );
  const holeDiameter = Math.max(
    Math.round(safeDiscSize * ratios.holeDiameterRatio),
    6,
  );

  return {
    labelDiameter,
    labelRadius: Math.round(labelDiameter / 2),
    holeDiameter,
    holeRadius: Math.round(holeDiameter / 2),
  };
}

export function getVinylEdgeSpec(): VinylEdgeSpec {
  return VINYL_EDGE_SPEC;
}

export function getVinylEdgeGeometry(discSize: number): {
  outerRimWidth: number;
  outerRimInnerRadius: number;
  innerRimDiameter: number;
  innerRimRadius: number;
  innerRimInnerRadius: number;
  innerRimThickness: number;
} {
  const safeDiscSize = Math.max(Math.round(discSize), 1);
  const discRadius = Math.round(safeDiscSize / 2);
  const outerRimWidth = Math.max(
    safeDiscSize * VINYL_EDGE_SPEC.outerRimWidthRatio,
    VINYL_EDGE_SPEC.outerRimMinWidth,
  );
  const outerRimInnerRadius = Math.max(discRadius - outerRimWidth, 0);
  const innerRimRadius =
    (safeDiscSize * VINYL_EDGE_SPEC.innerRimDiameterRatio) / 2;
  const innerRimInnerRadius = Math.max(
    innerRimRadius - VINYL_EDGE_SPEC.innerRimThickness,
    0,
  );

  return {
    outerRimWidth,
    outerRimInnerRadius,
    innerRimDiameter: innerRimRadius * 2,
    innerRimRadius,
    innerRimInnerRadius,
    innerRimThickness: VINYL_EDGE_SPEC.innerRimThickness,
  };
}
