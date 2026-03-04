export type VinylToneId = "simple-spin" | "spinning-cd";

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

const VINYL_TONES: Record<VinylToneId, VinylToneSpec> = {
  "simple-spin": {
    id: "simple-spin",
    shadeHexColor: "#000000",
    shadeAlphaByte: 132,
    labelHexColor: "#e8e2d5",
    labelAlphaByte: 238,
    holeHexColor: "#000000",
    holeAlphaByte: 255,
    showGroovesInPreview: false,
    showSheenInPreview: false,
  },
  "spinning-cd": {
    id: "spinning-cd",
    shadeHexColor: "#000000",
    shadeAlphaByte: 146,
    labelHexColor: "#e8e2d5",
    labelAlphaByte: 235,
    holeHexColor: "#000000",
    holeAlphaByte: 255,
    showGroovesInPreview: false,
    showSheenInPreview: false,
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
