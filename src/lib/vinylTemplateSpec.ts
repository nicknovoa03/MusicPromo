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
}

interface VinylCenterRatioSpec {
  labelDiameterRatio: number;
  holeDiameterRatio: number;
}

const VINYL_TONES: Record<VinylToneId, VinylToneSpec> = {
  "simple-spin": {
    id: "simple-spin",
    shadeHexColor: "#c2cee4",
    shadeAlphaByte: 76,
    labelHexColor: "#f9fbff",
    labelAlphaByte: 118,
    holeHexColor: "#0a0e16",
    holeAlphaByte: 232,
    showGroovesInPreview: true,
    showSheenInPreview: true,
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
