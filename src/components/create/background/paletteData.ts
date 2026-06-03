import { clamp, hexToHsl, hslToHex } from "@/lib/colorUtils";
import type { PaletteSwatch } from "./types";

export const CUSTOM_LIGHTNESS_MIN = 8;
export const CUSTOM_LIGHTNESS_MAX = 94;
export const DEFAULT_CUSTOM_HUE = 252;
export const DEFAULT_CUSTOM_SATURATION = 68;
export const DEFAULT_CUSTOM_LIGHTNESS = 34;
export const CUSTOM_TONE_OPTIONS = [14, 32, 50, 68, 86] as const;
export const CUSTOM_TONE_LABELS = ["Deep", "Dark", "Base", "Soft", "Glow"] as const;

interface PaletteSection {
  id: string;
  label: string;
  swatches: PaletteSwatch[];
}

function buildPaletteSwatches(
  prefix: string,
  hues: number[],
  saturation: number,
  lightness: number,
): PaletteSwatch[] {
  return hues.map((hue) => ({
    id: `${prefix}-${hue}`,
    label: `${Math.round(hue)}deg`,
    h: hue,
    s: saturation,
    l: lightness,
    hex: hslToHex(hue, saturation, lightness),
  }));
}

const PRIMARY_PALETTE_HUES = [0, 22, 42, 62, 90, 118, 145, 176, 205, 232, 262, 292, 322];
const SECONDARY_PALETTE_HUES = [8, 30, 52, 74, 102, 130, 158, 186, 214, 242, 272, 302, 332];
const GRAYSCALE_LIGHTNESS_STOPS = [8, 14, 22, 30, 38, 46, 56, 66, 76, 84, 90, 96];
const SOFT_PALETTE_SATURATION_STOPS = [34, 30, 28, 32, 30, 28, 30, 32, 30, 28, 30, 32, 34];
const SOFT_PALETTE_LIGHTNESS_STOPS = [72, 74, 76, 73, 75, 77, 74, 72, 73, 75, 74, 72, 71];

export const PALETTE_SECTIONS: PaletteSection[] = [
  {
    id: "core",
    label: "Palette A",
    swatches: buildPaletteSwatches("core", PRIMARY_PALETTE_HUES, 86, 52),
  },
  {
    id: "studio",
    label: "Palette B",
    swatches: SECONDARY_PALETTE_HUES.map((hue, index) => {
      const saturation = SOFT_PALETTE_SATURATION_STOPS[index] ?? 30;
      const lightness = SOFT_PALETTE_LIGHTNESS_STOPS[index] ?? 74;
      return {
        id: `studio-${hue}`,
        label: `${Math.round(hue)}deg`,
        h: hue,
        s: saturation,
        l: lightness,
        hex: hslToHex(hue, saturation, lightness),
      };
    }),
  },
  {
    id: "gray",
    label: "Grayscale",
    swatches: GRAYSCALE_LIGHTNESS_STOPS.map((lightness) => ({
      id: `gray-${lightness}`,
      label: `Gray ${lightness}`,
      h: 0,
      s: 0,
      l: lightness,
      hex: hslToHex(0, 0, lightness),
    })),
  },
];

export function parseCustomColorFromHex(hex: string | null | undefined): {
  hue: number;
  saturation: number;
  lightness: number;
} {
  const parsed = hex ? hexToHsl(hex) : null;
  if (parsed) {
    return {
      hue: parsed.h,
      saturation: clamp(parsed.s, 0, 100),
      lightness: clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX),
    };
  }
  return {
    hue: DEFAULT_CUSTOM_HUE,
    saturation: DEFAULT_CUSTOM_SATURATION,
    lightness: DEFAULT_CUSTOM_LIGHTNESS,
  };
}
