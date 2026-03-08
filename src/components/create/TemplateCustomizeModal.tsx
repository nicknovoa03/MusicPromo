import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  Easing,
  Image as RNImage,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import * as ExpoSwiftUI from "@expo/ui/swift-ui";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { toByteArray } from "base64-js";
import { TemplateInfoBadge } from "@/components/create/TemplateInfoBadge";
import { colors, radius, spacing, typography } from "@/constants/tokens";
import {
  getIOSNativeUIPhase5Availability,
  type ExpoSwiftUIModule,
} from "@/lib/iosNativeUi";
import { persistPickedMediaFile } from "@/lib/mediaStorage";
import { getTemplateDefinition, type TemplateTweaks } from "@/lib/templates";

interface TemplateCustomizeModalProps {
  visible: boolean;
  templateId: string;
  photoUri?: string | null;
  value: TemplateTweaks;
  showTemplateInfo?: boolean;
  onClose: () => void;
  onApply: (next: TemplateTweaks) => void;
}

interface BackgroundOption {
  id: string;
  label: string;
  color: string | null;
  swatch: string;
}

type TemplateControlTab = "quickTune" | "background" | "advancedMotion";

const TEMPLATE_CONTROL_TABS: Array<{ id: TemplateControlTab; label: string }> = [
  { id: "quickTune", label: "Style" },
  { id: "background", label: "Background" },
  { id: "advancedMotion", label: "Motion" },
];

function isPresetBackgroundColor(
  color: string | null | undefined,
  options: BackgroundOption[],
): boolean {
  return options.some((option) => option.color === (color ?? null));
}

const SPIN_SPEED_OPTIONS = [0.6, 0.8, 1, 1.25, 1.5];
const RECORD_SIZE_OPTIONS = [0.8, 0.9, 1, 1.1, 1.2];
const ARTWORK_SCALE_OPTIONS = [1, 2, 3, 4, 5];
const RECORD_TRANSPARENCY_OPTIONS = [0, 0.15, 0.3, 0.45, 0.6];
const BACKGROUND_BLUR_OPTIONS = [0, 2, 4, 8, 12, 18];
const ROTATION_START_OPTIONS = [0, 90, 180, -90];
const ROTATION_DIRECTION_OPTIONS: Array<{
  label: string;
  value: "cw" | "ccw";
}> = [
  { label: "CW", value: "cw" },
  { label: "CCW", value: "ccw" },
];
const DEFAULT_CUSTOM_SATURATION = 68;
const CUSTOM_LIGHTNESS_MIN = 8;
const CUSTOM_LIGHTNESS_MAX = 94;
const DEFAULT_CUSTOM_HUE = 252;
const DEFAULT_CUSTOM_LIGHTNESS = 34;
const CUSTOM_TONE_OPTIONS = [14, 32, 50, 68, 86];
const CUSTOM_TONE_LABELS = ["Deep", "Dark", "Base", "Soft", "Glow"] as const;
const STAGE_HORIZONTAL_PADDING = spacing.sm * 2;
const SHEET_RESTING_OFFSET = 14;
const PHOTO_BACKGROUND_SWATCH_COUNT = 5;
const FALLBACK_BACKGROUND_OPTIONS: BackgroundOption[] = [
  { id: "default", label: "Default", color: null, swatch: "#080A12" },
  { id: "indigo", label: "Indigo", color: "#14142d", swatch: "#35357a" },
  { id: "midnight", label: "Midnight", color: "#0a0f1c", swatch: "#1d2f58" },
  { id: "charcoal", label: "Charcoal", color: "#111114", swatch: "#37373e" },
  { id: "sunset", label: "Sunset", color: "#211121", swatch: "#8f3f7d" },
];

function formatSpeed(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function formatTransparency(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatRecordSize(value: number): string {
  return `${Math.round(clamp(value, 0.75, 1.3) * 100)}%`;
}

function formatArtworkScale(value: number): string {
  const normalized = clamp(value, 1, 5);
  const rounded = Math.round(normalized);
  if (Math.abs(normalized - rounded) < 0.05) {
    return `${rounded}x`;
  }
  return `${normalized.toFixed(1)}x`;
}

function formatArtworkScalePercent(value: number): string {
  return `${Math.round(clamp(value, 1, 5) * 100)}%`;
}

function formatBlur(value: number): string {
  return value <= 0 ? "Off" : `${value}px`;
}

function formatRotationStart(value: number): string {
  if (value === 0) return "0°";
  const displayValue = value === -90 ? 270 : value;
  return `${displayValue}°`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function findClosestOptionIndex(options: number[], value: number): number {
  const exactIndex = options.indexOf(value);
  if (exactIndex >= 0) return exactIndex;
  if (options.length === 0) return 0;

  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const distance = Math.abs(option - value);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * light - 1)) * sat;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = light - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 60) {
    red = chroma;
    green = x;
  } else if (hue < 120) {
    red = x;
    green = chroma;
  } else if (hue < 180) {
    green = chroma;
    blue = x;
  } else if (hue < 240) {
    green = x;
    blue = chroma;
  } else if (hue < 300) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const toHex = (value: number) =>
    Math.round((value + match) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

interface PaletteSwatch {
  id: string;
  label: string;
  h: number;
  s: number;
  l: number;
  hex: string;
}

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

const PALETTE_SECTIONS: PaletteSection[] = [
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

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const normalized = hex.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return null;
  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6;
    else if (max === g) hue = (b - r) / delta + 2;
    else hue = (r - g) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function hueDistance(a: number, b: number): number {
  const delta = Math.abs(a - b) % 360;
  return Math.min(delta, 360 - delta);
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;

  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const lightness = (max + min) / 2;
  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  let hue = 0;
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6;
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }

  return {
    h: hue,
    s: saturation * 100,
    l: lightness * 100,
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) =>
    Math.round(clamp(value, 0, 255))
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function thumbHashToApproximateAspectRatio(hash: Uint8Array): number {
  const header = hash[3];
  const hasAlpha = hash[2] & 0x80;
  const isLandscape = hash[4] & 0x80;
  const lx = isLandscape ? (hasAlpha ? 5 : 7) : header & 7;
  const ly = isLandscape ? header & 7 : hasAlpha ? 5 : 7;
  return lx / ly;
}

// Adapted from the ThumbHash reference decoder (MIT) to derive color clusters.
function decodeThumbHashToRGBA(hash: Uint8Array) {
  const { PI, min, max, cos, round } = Math;
  const header24 = hash[0] | (hash[1] << 8) | (hash[2] << 16);
  const header16 = hash[3] | (hash[4] << 8);
  const lDc = (header24 & 63) / 63;
  const pDc = ((header24 >> 6) & 63) / 31.5 - 1;
  const qDc = ((header24 >> 12) & 63) / 31.5 - 1;
  const lScale = ((header24 >> 18) & 31) / 31;
  const hasAlpha = header24 >> 23;
  const pScale = ((header16 >> 3) & 63) / 63;
  const qScale = ((header16 >> 9) & 63) / 63;
  const isLandscape = header16 >> 15;
  const lx = max(3, isLandscape ? (hasAlpha ? 5 : 7) : header16 & 7);
  const ly = max(3, isLandscape ? header16 & 7 : hasAlpha ? 5 : 7);
  const aDc = hasAlpha ? (hash[5] & 15) / 15 : 1;
  const aScale = (hash[5] >> 4) / 15;

  const acStart = hasAlpha ? 6 : 5;
  let acIndex = 0;
  const decodeChannel = (nx: number, ny: number, scale: number) => {
    const ac: number[] = [];
    for (let cy = 0; cy < ny; cy += 1) {
      for (let cx = cy ? 0 : 1; cx * ny < nx * (ny - cy); cx += 1) {
        const hashByte = hash[acStart + (acIndex >> 1)] ?? 0;
        const value = (hashByte >> ((acIndex++ & 1) << 2)) & 15;
        ac.push((value / 7.5 - 1) * scale);
      }
    }
    return ac;
  };

  const lAc = decodeChannel(lx, ly, lScale);
  const pAc = decodeChannel(3, 3, pScale * 1.25);
  const qAc = decodeChannel(3, 3, qScale * 1.25);
  const aAc = hasAlpha ? decodeChannel(5, 5, aScale) : null;

  const ratio = thumbHashToApproximateAspectRatio(hash);
  const w = round(ratio > 1 ? 32 : 32 * ratio);
  const h = round(ratio > 1 ? 32 / ratio : 32);
  const rgba = new Uint8Array(w * h * 4);
  const fx: number[] = [];
  const fy: number[] = [];

  for (let y = 0, i = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1, i += 4) {
      let l = lDc;
      let p = pDc;
      let q = qDc;
      let a = aDc;

      for (let cx = 0, n = max(lx, hasAlpha ? 5 : 3); cx < n; cx += 1) {
        fx[cx] = cos((PI / w) * (x + 0.5) * cx);
      }
      for (let cy = 0, n = max(ly, hasAlpha ? 5 : 3); cy < n; cy += 1) {
        fy[cy] = cos((PI / h) * (y + 0.5) * cy);
      }

      for (let cy = 0, j = 0; cy < ly; cy += 1) {
        for (
          let cx = cy ? 0 : 1, fy2 = fy[cy] * 2;
          cx * ly < lx * (ly - cy);
          cx += 1, j += 1
        ) {
          l += lAc[j] * fx[cx] * fy2;
        }
      }

      for (let cy = 0, j = 0; cy < 3; cy += 1) {
        for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 3 - cy; cx += 1, j += 1) {
          const f = fx[cx] * fy2;
          p += pAc[j] * f;
          q += qAc[j] * f;
        }
      }

      if (hasAlpha && aAc) {
        for (let cy = 0, j = 0; cy < 5; cy += 1) {
          for (let cx = cy ? 0 : 1, fy2 = fy[cy] * 2; cx < 5 - cy; cx += 1, j += 1) {
            a += aAc[j] * fx[cx] * fy2;
          }
        }
      }

      const blue = l - (2 / 3) * p;
      const red = (3 * l - blue + q) / 2;
      const green = red - q;
      rgba[i] = max(0, 255 * min(1, red));
      rgba[i + 1] = max(0, 255 * min(1, green));
      rgba[i + 2] = max(0, 255 * min(1, blue));
      rgba[i + 3] = max(0, 255 * min(1, a));
    }
  }

  return { rgba };
}

function colorDistanceSquared(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return dr * dr + dg * dg + db * db;
}

function extractProminentPhotoHexes(hashBytes: Uint8Array, count: number): string[] {
  const { rgba } = decodeThumbHashToRGBA(hashBytes);
  const bins = new Map<
    string,
    { rSum: number; gSum: number; bSum: number; weight: number }
  >();

  for (let index = 0; index < rgba.length; index += 4) {
    const alpha = rgba[index + 3] / 255;
    if (alpha < 0.08) continue;

    const r = rgba[index];
    const g = rgba[index + 1];
    const b = rgba[index + 2];
    const maxChannel = Math.max(r, g, b);
    const minChannel = Math.min(r, g, b);
    const saturation = maxChannel <= 0 ? 0 : (maxChannel - minChannel) / maxChannel;
    const weight = alpha * (0.55 + saturation * 0.8);
    const key = `${r >> 4}-${g >> 4}-${b >> 4}`;
    const existing = bins.get(key);
    if (existing) {
      existing.rSum += r * weight;
      existing.gSum += g * weight;
      existing.bSum += b * weight;
      existing.weight += weight;
    } else {
      bins.set(key, {
        rSum: r * weight,
        gSum: g * weight,
        bSum: b * weight,
        weight,
      });
    }
  }

  const sortedBins = Array.from(bins.values())
    .filter((bin) => bin.weight > 0)
    .map((bin) => ({
      r: Math.round(bin.rSum / bin.weight),
      g: Math.round(bin.gSum / bin.weight),
      b: Math.round(bin.bSum / bin.weight),
      weight: bin.weight,
    }))
    .sort((a, b) => b.weight - a.weight);

  const prominent: Array<{ r: number; g: number; b: number }> = [];
  const MIN_DISTANCE = 40 * 40;
  for (const candidate of sortedBins) {
    const isDistinct = prominent.every(
      (entry) => colorDistanceSquared(entry, candidate) >= MIN_DISTANCE,
    );
    if (!isDistinct) continue;
    prominent.push(candidate);
    if (prominent.length >= count) break;
  }

  for (const candidate of sortedBins) {
    if (prominent.length >= count) break;
    const alreadyPresent = prominent.some(
      (entry) => colorDistanceSquared(entry, candidate) < 16 * 16,
    );
    if (alreadyPresent) continue;
    prominent.push(candidate);
  }

  const result = prominent.slice(0, count).map((entry) => rgbToHex(entry.r, entry.g, entry.b));
  if (result.length === 0) return result;

  const fallbackBase = hexToHsl(result[0]) ?? { h: 220, s: 40, l: 50 };
  while (result.length < count) {
    const index = result.length;
    const hue = (fallbackBase.h + index * 47) % 360;
    const saturation = clamp(
      fallbackBase.s + (index % 2 === 0 ? 10 : -6),
      24,
      88,
    );
    const lightness = clamp(
      fallbackBase.l + (index % 2 === 0 ? 12 : -10),
      22,
      74,
    );
    result.push(hslToHex(hue, saturation, lightness));
  }

  return result.slice(0, count);
}

async function buildPhotoMatchedBackgroundOptions(photoUri: string) {
  try {
    const thumbhash = await ExpoImage.generateThumbhashAsync(photoUri);
    if (!thumbhash) return null;

    const normalizedThumbhash = thumbhash.replace(/\\/g, "/");
    const thumbhashRemainder = normalizedThumbhash.length % 4;
    const paddedThumbhash =
      thumbhashRemainder === 0
        ? normalizedThumbhash
        : normalizedThumbhash.padEnd(
            normalizedThumbhash.length + (4 - thumbhashRemainder),
            "=",
          );
    const hashBytes = toByteArray(paddedThumbhash);
    if (hashBytes.length < 5) return null;

    const prominentHexes = extractProminentPhotoHexes(
      hashBytes,
      PHOTO_BACKGROUND_SWATCH_COUNT,
    );
    if (prominentHexes.length === 0) return null;

    return prominentHexes.map((hex, index) => {
      const parsed = hexToHsl(hex) ?? { h: (index * 72) % 360, s: 56, l: 48 };
      const backgroundSaturation = clamp(parsed.s * 0.9 + 20, 30, 96);
      const backgroundLightness = clamp(14 + parsed.l * 0.32, 10, 48);
      const swatchSaturation = clamp(parsed.s * 1.08 + 14, 40, 100);
      const swatchLightness = clamp(30 + parsed.l * 0.66, 30, 88);

      return {
        id: `photo-${index}`,
        label: `Photo ${index + 1}`,
        color: hslToHex(parsed.h, backgroundSaturation, backgroundLightness),
        swatch: hslToHex(parsed.h, swatchSaturation, swatchLightness),
      };
    });
  } catch {
    return null;
  }
}

interface PaletteStripProps {
  hue: number;
  saturation: number;
  lightness: number;
  disabled?: boolean;
  onSelect: (swatch: PaletteSwatch) => void;
}

function PaletteStrip({
  hue,
  saturation,
  lightness,
  disabled = false,
  onSelect,
}: PaletteStripProps) {
  const normalizedHue = ((hue % 360) + 360) % 360;
  const [paletteViewportWidth, setPaletteViewportWidth] = useState(0);
  const [paletteScrollX, setPaletteScrollX] = useState(0);
  const [sectionLayouts, setSectionLayouts] = useState<
    Record<string, { x: number; width: number }>
  >({});
  const selectedGrayscaleSwatchId = useMemo(() => {
    if (saturation > 8) return null;
    const grayscaleSection = PALETTE_SECTIONS.find((section) => section.id === "gray");
    if (!grayscaleSection) return null;

    const closest = grayscaleSection.swatches.reduce(
      (best, swatch) => {
        const swatchLightness = clamp(
          swatch.l,
          CUSTOM_LIGHTNESS_MIN,
          CUSTOM_LIGHTNESS_MAX,
        );
        const distance = Math.abs(lightness - swatchLightness);
        if (!best || distance < best.distance) {
          return { id: swatch.id, distance };
        }
        return best;
      },
      null as { id: string; distance: number } | null,
    );
    return closest?.id ?? null;
  }, [lightness, saturation]);

  const isSelected = useCallback(
    (swatch: PaletteSwatch) => {
      if (swatch.s <= 2) {
        return saturation <= 8 && swatch.id === selectedGrayscaleSwatchId;
      }
      return (
        hueDistance(normalizedHue, swatch.h) <= 10 &&
        Math.abs(saturation - swatch.s) <= 16
      );
    },
    [normalizedHue, saturation, selectedGrayscaleSwatchId],
  );
  const activePalettePageIndex = useMemo(() => {
    if (paletteViewportWidth <= 0) return 0;
    const viewportCenter = paletteScrollX + paletteViewportWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    PALETTE_SECTIONS.forEach((section, index) => {
      const layout = sectionLayouts[section.id];
      if (!layout) return;
      const sectionCenter = layout.x + layout.width / 2;
      const distance = Math.abs(sectionCenter - viewportCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex;
  }, [paletteScrollX, paletteViewportWidth, sectionLayouts]);

  return (
    <View style={styles.paletteStripWrap}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.paletteStripRow}
        style={styles.paletteStripScroll}
        onLayout={(event) => {
          setPaletteViewportWidth(event.nativeEvent.layout.width);
        }}
        onScroll={(event) => {
          setPaletteScrollX(event.nativeEvent.contentOffset.x);
        }}
        scrollEventThrottle={16}
      >
        {PALETTE_SECTIONS.map((section, sectionIndex) => (
          <View
            key={section.id}
            style={styles.paletteSection}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setSectionLayouts((previous) => {
                const existing = previous[section.id];
                if (
                  existing &&
                  Math.abs(existing.x - x) < 1 &&
                  Math.abs(existing.width - width) < 1
                ) {
                  return previous;
                }
                return { ...previous, [section.id]: { x, width } };
              });
            }}
          >
            <Text style={styles.paletteSectionLabel}>{section.label}</Text>
            <View style={styles.paletteSectionSwatches}>
              {section.swatches.map((swatch) => {
                const selected = isSelected(swatch);
                return (
                  <Pressable
                    key={swatch.id}
                    onPress={() => onSelect(swatch)}
                    disabled={disabled}
                    style={[
                      styles.paletteDotWrap,
                      selected && styles.paletteDotWrapSelected,
                      disabled && styles.paletteDotWrapDisabled,
                    ]}
                    accessibilityLabel={`${section.label} ${swatch.label}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                  >
                    <View
                      style={[
                        styles.paletteDot,
                        { backgroundColor: swatch.hex },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>
            {sectionIndex < PALETTE_SECTIONS.length - 1 ? (
              <View style={styles.paletteSectionDivider} />
            ) : null}
          </View>
        ))}
      </ScrollView>
      <View style={styles.palettePager}>
        {PALETTE_SECTIONS.map((section, index) => {
          const isActive = index === activePalettePageIndex;
          return (
            <View
              key={`pager-${section.id}`}
              style={[
                styles.palettePagerDot,
                isActive && styles.palettePagerDotActive,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

async function triggerSelectionHaptic() {
  try {
    if (Platform.OS === "android") {
      await Haptics.performAndroidHapticsAsync(
        Haptics.AndroidHaptics.Segment_Tick,
      );
      return;
    }
    await Haptics.selectionAsync();
  } catch {
    // Ignore unsupported haptic failures.
  }
}

export function TemplateCustomizeModal({
  visible,
  templateId,
  photoUri,
  value,
  showTemplateInfo = false,
  onClose,
  onApply,
}: TemplateCustomizeModalProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const windowWidthRef = useRef(windowWidth);
  const windowHeightRef = useRef(windowHeight);
  const openAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dragStartOffsetRef = useRef(0);
  const isClosingFromSwipeRef = useRef(false);
  const closeRequestedRef = useRef(false);
  const closeAnimationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [draft, setDraft] = useState<TemplateTweaks>(value);
  const [customHue, setCustomHue] = useState(DEFAULT_CUSTOM_HUE);
  const [customSaturation, setCustomSaturation] = useState(DEFAULT_CUSTOM_SATURATION);
  const [customLightness, setCustomLightness] = useState(DEFAULT_CUSTOM_LIGHTNESS);
  const [isCustomColorEnabled, setIsCustomColorEnabled] = useState(false);
  const [isBackgroundPhotoLoading, setIsBackgroundPhotoLoading] = useState(false);
  const [activeControlTab, setActiveControlTab] = useState<TemplateControlTab>(
    "quickTune",
  );
  const [lastPresetBackgroundColor, setLastPresetBackgroundColor] = useState<
    string | null
  >(null);
  const [backgroundOptions, setBackgroundOptions] = useState<BackgroundOption[]>(
    FALLBACK_BACKGROUND_OPTIONS,
  );
  const customColor = useMemo(
    () => hslToHex(customHue, customSaturation, customLightness),
    [customHue, customSaturation, customLightness],
  );
  const modalTopInset = useMemo(() => {
    if (Platform.OS !== "ios") return 0;
    if (insets.top > 0) return insets.top;
    return 44;
  }, [insets.top]);

  useEffect(() => {
    if (visible) return;
    windowWidthRef.current = windowWidth;
    windowHeightRef.current = windowHeight;
  }, [visible, windowHeight, windowWidth]);

  useEffect(() => {
    if (!visible) return;
    isClosingFromSwipeRef.current = false;
    closeRequestedRef.current = false;
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = null;
    }
    dragStartOffsetRef.current = 0;
    openAnimationRef.current?.stop();
    const entryOffset = Math.max(windowHeightRef.current + SHEET_RESTING_OFFSET, 1);
    sheetTranslateY.stopAnimation();
    sheetTranslateY.setValue(entryOffset);
    openAnimationRef.current = Animated.timing(sheetTranslateY, {
      toValue: SHEET_RESTING_OFFSET,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    });
    openAnimationRef.current.start(({ finished }) => {
      if (finished) {
        sheetTranslateY.setValue(SHEET_RESTING_OFFSET);
      }
      openAnimationRef.current = null;
    });
    setActiveControlTab("quickTune");
  }, [visible, sheetTranslateY]);

  useEffect(
    () => () => {
      openAnimationRef.current?.stop();
      openAnimationRef.current = null;
      if (closeAnimationTimerRef.current) {
        clearTimeout(closeAnimationTimerRef.current);
        closeAnimationTimerRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const nextPhotoUri = photoUri?.trim();
    if (!nextPhotoUri) {
      setBackgroundOptions(FALLBACK_BACKGROUND_OPTIONS);
      return;
    }

    let isActive = true;
    void buildPhotoMatchedBackgroundOptions(nextPhotoUri).then((matchedOptions) => {
      if (!isActive) return;
      setBackgroundOptions(matchedOptions ?? FALLBACK_BACKGROUND_OPTIONS);
    });
    return () => {
      isActive = false;
    };
  }, [photoUri]);

  useEffect(() => {
    if (!visible) return;
    setDraft(value);
    const hasBackgroundPhoto = Boolean(value.stageBackgroundImageUri);
    const isPreset = isPresetBackgroundColor(
      value.stageBackgroundColor,
      backgroundOptions,
    );
    setIsCustomColorEnabled(
      !hasBackgroundPhoto && Boolean(value.stageBackgroundColor && !isPreset),
    );
    setLastPresetBackgroundColor(isPreset ? value.stageBackgroundColor ?? null : null);

    const parsed = value.stageBackgroundColor
      ? hexToHsl(value.stageBackgroundColor)
      : null;
    if (parsed) {
      setCustomHue(parsed.h);
      setCustomSaturation(clamp(parsed.s, 0, 100));
      setCustomLightness(
        clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX),
      );
      return;
    }
    setCustomHue(DEFAULT_CUSTOM_HUE);
    setCustomSaturation(DEFAULT_CUSTOM_SATURATION);
    setCustomLightness(DEFAULT_CUSTOM_LIGHTNESS);
  }, [value, visible]);

  const isBackgroundPhotoSelected = Boolean(draft.stageBackgroundImageUri);
  const templateDefinition = getTemplateDefinition(templateId);
  const TemplateStageComponent = templateDefinition.StageComponent;
  const isVinylTemplate = templateDefinition.parity.vinylTone === "simple-spin";
  const usesGenericSizeLabel =
    templateDefinition.id === "whole" || templateDefinition.id === "cd";
  const recordSizeControlLabel = usesGenericSizeLabel ? "Size" : "Record Size";
  const recordSizeNativeLabel = usesGenericSizeLabel ? "Size" : "Record size";
  const recordSizeAccessibilityPrefix = usesGenericSizeLabel ? "Size" : "Record size";
  const stageViewportWidth = visible ? windowWidthRef.current : windowWidth;
  const stageViewportHeight = visible ? windowHeightRef.current : windowHeight;
  const previewStageSize = Math.min(
    stageViewportWidth - STAGE_HORIZONTAL_PADDING,
    stageViewportHeight * 0.66,
    520,
  );
  const showToneOptions = customSaturation > 2;
  const nativeTemplateControlsAvailability = getIOSNativeUIPhase5Availability({
    minIOSVersion: 16,
  });
  const nativeTemplateControlsEnabledByContract =
    nativeTemplateControlsAvailability.enabled;
  const expoSwiftUI = nativeTemplateControlsEnabledByContract
    ? (ExpoSwiftUI as ExpoSwiftUIModule)
    : null;
  const expoSwiftUIAny = expoSwiftUI as Record<string, unknown> | null;
  const hasNativeTemplateControlsComponents = Boolean(
    expoSwiftUIAny &&
      "Host" in expoSwiftUIAny &&
      "Form" in expoSwiftUIAny &&
      "Section" in expoSwiftUIAny &&
      "Picker" in expoSwiftUIAny &&
      "Slider" in expoSwiftUIAny &&
      "LabeledContent" in expoSwiftUIAny &&
      "Text" in expoSwiftUIAny &&
      "Button" in expoSwiftUIAny &&
      "ColorPicker" in expoSwiftUIAny,
  );
  const canUseNativeTemplateControls =
    false &&
    nativeTemplateControlsEnabledByContract &&
    expoSwiftUI !== null &&
    hasNativeTemplateControlsComponents;
  const backgroundOptionsLabels = useMemo(
    () => backgroundOptions.map((option) => option.label),
    [backgroundOptions],
  );
  const selectedBackgroundOptionIndex = useMemo(() => {
    const optionIndex = backgroundOptions.findIndex(
      (option) => option.color === (draft.stageBackgroundColor ?? null),
    );
    return optionIndex >= 0 ? optionIndex : null;
  }, [backgroundOptions, draft.stageBackgroundColor]);
  const activeControlTabIndex = useMemo(
    () =>
      Math.max(
        0,
        TEMPLATE_CONTROL_TABS.findIndex((tab) => tab.id === activeControlTab),
      ),
    [activeControlTab],
  );

  const updateSpinSpeed = useCallback((spinSpeed: number, withHaptics = true) => {
    if (spinSpeed === draft.spinSpeed) return;
    setDraft((prev) => ({ ...prev, spinSpeed }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.spinSpeed]);

  const updateRecordSize = useCallback((recordSize: number, withHaptics = true) => {
    if (recordSize === draft.recordSize) return;
    setDraft((prev) => ({ ...prev, recordSize }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.recordSize]);

  const updateArtworkScale = useCallback((artworkScale: number, withHaptics = true) => {
    if (artworkScale === draft.artworkScale) return;
    setDraft((prev) => ({ ...prev, artworkScale }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.artworkScale]);

  const updateRecordTransparency = useCallback((
    recordTransparency: number,
    withHaptics = true,
  ) => {
    if (recordTransparency === draft.recordTransparency) return;
    setDraft((prev) => ({ ...prev, recordTransparency }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.recordTransparency]);

  const updateBackgroundBlur = useCallback((backgroundBlur: number, withHaptics = true) => {
    if (backgroundBlur === draft.backgroundBlur) return;
    setDraft((prev) => ({ ...prev, backgroundBlur }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.backgroundBlur]);

  const updateRotationStartDeg = useCallback((
    rotationStartDeg: number,
    withHaptics = true,
  ) => {
    if (rotationStartDeg === draft.rotationStartDeg) return;
    setDraft((prev) => ({ ...prev, rotationStartDeg }));
    if (withHaptics) {
      void triggerSelectionHaptic();
    }
  }, [draft.rotationStartDeg]);

  const updateRotationDirection = useCallback((rotationDirection: "cw" | "ccw") => {
    if (rotationDirection === draft.rotationDirection) return;
    setDraft((prev) => ({ ...prev, rotationDirection }));
    void triggerSelectionHaptic();
  }, [draft.rotationDirection]);

  const updateBackground = useCallback(
    (stageBackgroundColor: string | null, withHaptics = true) => {
      const nextColor = stageBackgroundColor ?? null;
      if (
        nextColor === (draft.stageBackgroundColor ?? null) &&
        !draft.stageBackgroundImageUri
      ) {
        return;
      }
      setDraft((prev) => ({
        ...prev,
        stageBackgroundColor: nextColor,
        stageBackgroundImageUri: null,
      }));
      if (withHaptics) {
        void triggerSelectionHaptic();
      }
    },
    [draft.stageBackgroundColor, draft.stageBackgroundImageUri],
  );

  const toggleCustomColorEnabled = useCallback(
    (enabled: boolean) => {
      setIsCustomColorEnabled(enabled);
      if (enabled) {
        const current = draft.stageBackgroundColor ?? null;
        if (
          current &&
          backgroundOptions.some((option) => option.color === current)
        ) {
          setLastPresetBackgroundColor(current);
        }
        updateBackground(customColor);
        return;
      }

      const fallback = lastPresetBackgroundColor ?? null;
      updateBackground(fallback);
    },
    [
      backgroundOptions,
      customColor,
      draft.stageBackgroundColor,
      lastPresetBackgroundColor,
      updateBackground,
    ],
  );

  const handleCustomPaletteSelect = useCallback(
    (swatch: PaletteSwatch) => {
      const nextHue = clamp(swatch.h, 0, 360);
      const nextSaturation = clamp(swatch.s, 0, 100);
      const nextLightness = clamp(
        swatch.l,
        CUSTOM_LIGHTNESS_MIN,
        CUSTOM_LIGHTNESS_MAX,
      );
      setCustomHue(nextHue);
      setCustomSaturation(nextSaturation);
      setCustomLightness(nextLightness);
      if (isCustomColorEnabled) {
        updateBackground(hslToHex(nextHue, nextSaturation, nextLightness), false);
      }
      void triggerSelectionHaptic();
    },
    [isCustomColorEnabled, updateBackground],
  );

  const handleCustomLightnessChange = useCallback(
    (nextLightness: number) => {
      const clampedLightness = clamp(
        nextLightness,
        CUSTOM_LIGHTNESS_MIN,
        CUSTOM_LIGHTNESS_MAX,
      );
      setCustomLightness(clampedLightness);
      if (!isCustomColorEnabled) return;
      updateBackground(
        hslToHex(customHue, customSaturation, clampedLightness),
        false,
      );
    },
    [customHue, customSaturation, isCustomColorEnabled, updateBackground],
  );

  const handleCustomToneSelect = useCallback(
    (tone: number) => {
      if (tone === customLightness) return;
      handleCustomLightnessChange(tone);
      void triggerSelectionHaptic();
    },
    [customLightness, handleCustomLightnessChange],
  );

  const setBackgroundPhoto = useCallback(
    (stageBackgroundImageUri: string | null) => {
      const nextUri = stageBackgroundImageUri ?? null;
      if (
        nextUri === (draft.stageBackgroundImageUri ?? null) &&
        !isCustomColorEnabled
      ) {
        return;
      }
      setIsCustomColorEnabled(false);
      setDraft((prev) => ({
        ...prev,
        stageBackgroundImageUri: nextUri,
      }));
      if (nextUri) {
        void triggerSelectionHaptic();
      }
    },
    [draft.stageBackgroundImageUri, isCustomColorEnabled],
  );

  const handlePickBackgroundPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow photo access to use an image as template background.",
      );
      return;
    }

    setIsBackgroundPhotoLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        allowsEditing: false,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled || !result.assets[0]) return;

      const picked = result.assets[0];
      const persistedUri = await persistPickedMediaFile({
        sourceUri: picked.uri,
        fileNameHint:
          picked.fileName ?? picked.uri.split("/").pop() ?? "background-image.jpg",
      });
      setBackgroundPhoto(persistedUri);
    } catch {
      Alert.alert(
        "Background not applied",
        "Could not load that image. Please try another photo.",
      );
    } finally {
      setIsBackgroundPhotoLoading(false);
    }
  }, [setBackgroundPhoto]);

  const animateSheetBackToRest = useCallback(() => {
    Animated.timing(sheetTranslateY, {
      toValue: SHEET_RESTING_OFFSET,
      duration: 150,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [sheetTranslateY]);

  const requestCloseOnce = useCallback(() => {
    if (closeRequestedRef.current) return;
    closeRequestedRef.current = true;
    isClosingFromSwipeRef.current = false;
    dragStartOffsetRef.current = 0;
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
      closeAnimationTimerRef.current = null;
    }
    onClose();
  }, [onClose]);

  const closeFromSwipe = useCallback(() => {
    if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
    isClosingFromSwipeRef.current = true;
    dragStartOffsetRef.current = 0;
    openAnimationRef.current?.stop();
    openAnimationRef.current = null;
    sheetTranslateY.stopAnimation();
    if (closeAnimationTimerRef.current) {
      clearTimeout(closeAnimationTimerRef.current);
    }
    closeAnimationTimerRef.current = setTimeout(() => {
      requestCloseOnce();
    }, 220);
    Animated.timing(sheetTranslateY, {
      toValue: windowHeight + SHEET_RESTING_OFFSET + 56,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      requestCloseOnce();
    });
  }, [requestCloseOnce, sheetTranslateY, windowHeight]);

  const headerPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          !isClosingFromSwipeRef.current && !closeRequestedRef.current,
        onStartShouldSetPanResponderCapture: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) =>
          !isClosingFromSwipeRef.current &&
          gestureState.dy > 0 &&
          Math.abs(gestureState.dy) >= Math.abs(gestureState.dx),
        onMoveShouldSetPanResponderCapture: (_, gestureState) =>
          !isClosingFromSwipeRef.current &&
          gestureState.dy > 0 &&
          Math.abs(gestureState.dy) >= Math.abs(gestureState.dx),
        onPanResponderGrant: () => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          sheetTranslateY.stopAnimation((currentValue) => {
            dragStartOffsetRef.current = Number.isFinite(currentValue)
              ? Math.max(0, currentValue)
              : 0;
          });
        },
        onPanResponderMove: (_, gestureState) => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          if (
            gestureState.dy <= 0 &&
            dragStartOffsetRef.current <= SHEET_RESTING_OFFSET
          ) {
            return;
          }
          const nextOffset = clamp(
            dragStartOffsetRef.current + gestureState.dy,
            SHEET_RESTING_OFFSET,
            windowHeight,
          );
          sheetTranslateY.setValue(nextOffset);
        },
        onPanResponderRelease: (_, gestureState) => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          const draggedDistance = dragStartOffsetRef.current + gestureState.dy;
          const pullDistance = Math.max(
            0,
            draggedDistance - SHEET_RESTING_OFFSET,
          );
          const shouldDismiss = pullDistance > 12 || gestureState.vy > 0.12;
          dragStartOffsetRef.current = 0;
          if (shouldDismiss) {
            closeFromSwipe();
            return;
          }
          animateSheetBackToRest();
        },
        onPanResponderTerminate: () => {
          if (isClosingFromSwipeRef.current || closeRequestedRef.current) return;
          sheetTranslateY.stopAnimation((currentValue) => {
            dragStartOffsetRef.current = 0;
            if (currentValue > SHEET_RESTING_OFFSET + 2) {
              closeFromSwipe();
              return;
            }
            animateSheetBackToRest();
          });
        },
        onPanResponderTerminationRequest: () => false,
      }),
    [animateSheetBackToRest, closeFromSwipe, sheetTranslateY, windowHeight],
  );

  const backdropOpacity = useMemo(
    () =>
      sheetTranslateY.interpolate({
        inputRange: [
          SHEET_RESTING_OFFSET,
          windowHeight * 0.55,
          windowHeight + SHEET_RESTING_OFFSET,
        ],
        outputRange: [0.36, 0.18, 0],
        extrapolate: "clamp",
      }),
    [sheetTranslateY, windowHeight],
  );

  const handleNativeBackgroundPresetSelect = useCallback(
    (index: number) => {
      const option = backgroundOptions[index];
      if (!option) return;
      setIsCustomColorEnabled(false);
      setLastPresetBackgroundColor(option.color);
      updateBackground(option.color);
    },
    [backgroundOptions, updateBackground],
  );

  const handleNativeBackgroundColorChange = useCallback(
    (nextColor: string) => {
      setIsCustomColorEnabled(true);
      const parsed = hexToHsl(nextColor);
      if (parsed) {
        setCustomHue(parsed.h);
        setCustomSaturation(clamp(parsed.s, 0, 100));
        setCustomLightness(clamp(parsed.l, CUSTOM_LIGHTNESS_MIN, CUSTOM_LIGHTNESS_MAX));
      }
      updateBackground(nextColor, false);
    },
    [updateBackground],
  );
  const handleControlTabSelect = useCallback(
    (nextTab: TemplateControlTab, withHaptics = true) => {
      if (nextTab === activeControlTab) return;
      setActiveControlTab(nextTab);
      if (withHaptics) {
        void triggerSelectionHaptic();
      }
    },
    [activeControlTab],
  );

  return (
    <Modal
      visible={visible}
      animationType="none"
      presentationStyle="overFullScreen"
      transparent
      allowSwipeDismissal={false}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.modalBackdrop, { opacity: backdropOpacity }]}
        />
        <Animated.View
          style={[
            styles.sheetAnimatedLayer,
            {
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          <SafeAreaView style={styles.root} edges={["bottom"]}>
          <View
            style={[styles.topGestureZone, { paddingTop: modalTopInset }]}
            {...headerPanResponder.panHandlers}
          >
            <View style={styles.headerGestureArea}>
              <View style={styles.dragHandle} />
            </View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Template Controls</Text>
            </View>
          </View>

          <View style={styles.previewContainer}>
            <View style={styles.previewCard}>
              <TemplateStageComponent
                width={previewStageSize}
                height={previewStageSize}
                aspectRatio="1:1"
                photoUri={photoUri ?? null}
                isPlaying
                playbackLabel="Now Playing"
                trackTitle="Template Preview"
                subtitle="Template Controls"
                templateTweaks={draft}
              />
              {showTemplateInfo ? (
                <TemplateInfoBadge
                  templateId={templateId}
                  templateTweaks={draft}
                  aspectRatio="1:1"
                  compact
                  style={styles.previewTemplateInfoBadge}
                />
              ) : null}
            </View>
          </View>

          {canUseNativeTemplateControls && expoSwiftUI ? (
            <View style={styles.nativeControlsWrap}>
              <expoSwiftUI.Host
                style={styles.nativeControlsHost}
                useViewportSizeMeasurement
                colorScheme="dark"
              >
                <expoSwiftUI.Form>
                  <expoSwiftUI.Section>
                    <expoSwiftUI.Picker
                      label="Template control tabs"
                      options={TEMPLATE_CONTROL_TABS.map((tab) => tab.label)}
                      selectedIndex={activeControlTabIndex}
                      variant="segmented"
                      onOptionSelected={(event) => {
                        const nextTab =
                          TEMPLATE_CONTROL_TABS[event.nativeEvent.index]?.id ?? "quickTune";
                        handleControlTabSelect(nextTab, false);
                      }}
                    />
                    {activeControlTab === "quickTune" ? (
                      <>
                        <expoSwiftUI.LabeledContent label={recordSizeNativeLabel}>
                          <expoSwiftUI.Text>{formatRecordSize(draft.recordSize)}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={RECORD_SIZE_OPTIONS.length - 1}
                          steps={RECORD_SIZE_OPTIONS.length - 1}
                          value={findClosestOptionIndex(RECORD_SIZE_OPTIONS, draft.recordSize)}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, RECORD_SIZE_OPTIONS.length - 1),
                            );
                            const recordSize =
                              RECORD_SIZE_OPTIONS[sliderIndex] ?? draft.recordSize;
                            updateRecordSize(recordSize, false);
                          }}
                        />
                        {isVinylTemplate ? (
                          <>
                            <expoSwiftUI.LabeledContent label="Artwork size">
                              <expoSwiftUI.Text>
                                {`${formatArtworkScale(draft.artworkScale)} (${formatArtworkScalePercent(draft.artworkScale)})`}
                              </expoSwiftUI.Text>
                            </expoSwiftUI.LabeledContent>
                            <expoSwiftUI.Slider
                              min={0}
                              max={ARTWORK_SCALE_OPTIONS.length - 1}
                              steps={ARTWORK_SCALE_OPTIONS.length - 1}
                              value={findClosestOptionIndex(ARTWORK_SCALE_OPTIONS, draft.artworkScale)}
                              color={colors.accent.primary}
                              onValueChange={(nextValue) => {
                                const sliderIndex = Math.round(
                                  clamp(nextValue, 0, ARTWORK_SCALE_OPTIONS.length - 1),
                                );
                                const artworkScale =
                                  ARTWORK_SCALE_OPTIONS[sliderIndex] ?? draft.artworkScale;
                                updateArtworkScale(artworkScale, false);
                              }}
                            />
                          </>
                        ) : null}
                        <expoSwiftUI.LabeledContent label="Transparency">
                          <expoSwiftUI.Text>
                            {formatTransparency(draft.recordTransparency)}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={RECORD_TRANSPARENCY_OPTIONS.length - 1}
                          steps={RECORD_TRANSPARENCY_OPTIONS.length - 1}
                          value={findClosestOptionIndex(
                            RECORD_TRANSPARENCY_OPTIONS,
                            draft.recordTransparency,
                          )}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, RECORD_TRANSPARENCY_OPTIONS.length - 1),
                            );
                            const recordTransparency =
                              RECORD_TRANSPARENCY_OPTIONS[sliderIndex] ??
                              draft.recordTransparency;
                            updateRecordTransparency(recordTransparency, false);
                          }}
                        />
                      </>
                    ) : null}

                    {activeControlTab === "background" ? (
                      <>
                        <expoSwiftUI.Picker
                          label="Preset"
                          options={backgroundOptionsLabels}
                          selectedIndex={selectedBackgroundOptionIndex}
                          variant="menu"
                          onOptionSelected={(event) => {
                            handleNativeBackgroundPresetSelect(event.nativeEvent.index);
                          }}
                        />
                        <expoSwiftUI.ColorPicker
                          label="Custom color"
                          selection={draft.stageBackgroundColor ?? customColor}
                          supportsOpacity={false}
                          onValueChanged={handleNativeBackgroundColorChange}
                        />
                        <expoSwiftUI.LabeledContent label="Photo background">
                          <expoSwiftUI.Text>
                            {draft.stageBackgroundImageUri ? "Selected" : "None"}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Button
                          systemImage="photo.badge.plus"
                          disabled={isBackgroundPhotoLoading}
                          onPress={() => {
                            void handlePickBackgroundPhoto();
                          }}
                        >
                          {isBackgroundPhotoLoading
                            ? "Loading photo..."
                            : "Choose background photo"}
                        </expoSwiftUI.Button>
                        {draft.stageBackgroundImageUri ? (
                          <expoSwiftUI.Button
                            systemImage="xmark.circle"
                            onPress={() => {
                              setBackgroundPhoto(null);
                            }}
                          >
                            Remove background photo
                          </expoSwiftUI.Button>
                        ) : null}
                        {isBackgroundPhotoSelected ? (
                          <>
                            <expoSwiftUI.LabeledContent label="Background blur">
                              <expoSwiftUI.Text>{formatBlur(draft.backgroundBlur)}</expoSwiftUI.Text>
                            </expoSwiftUI.LabeledContent>
                            <expoSwiftUI.Slider
                              min={0}
                              max={BACKGROUND_BLUR_OPTIONS.length - 1}
                              steps={BACKGROUND_BLUR_OPTIONS.length - 1}
                              value={findClosestOptionIndex(
                                BACKGROUND_BLUR_OPTIONS,
                                draft.backgroundBlur,
                              )}
                              color={colors.accent.primary}
                              onValueChange={(nextValue) => {
                                const sliderIndex = Math.round(
                                  clamp(nextValue, 0, BACKGROUND_BLUR_OPTIONS.length - 1),
                                );
                                const backgroundBlur =
                                  BACKGROUND_BLUR_OPTIONS[sliderIndex] ?? draft.backgroundBlur;
                                updateBackgroundBlur(backgroundBlur, false);
                              }}
                            />
                          </>
                        ) : null}
                      </>
                    ) : null}

                    {activeControlTab === "advancedMotion" ? (
                      <>
                        <expoSwiftUI.LabeledContent label="Spin speed">
                          <expoSwiftUI.Text>{formatSpeed(draft.spinSpeed)}</expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={SPIN_SPEED_OPTIONS.length - 1}
                          steps={SPIN_SPEED_OPTIONS.length - 1}
                          value={findClosestOptionIndex(SPIN_SPEED_OPTIONS, draft.spinSpeed)}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, SPIN_SPEED_OPTIONS.length - 1),
                            );
                            const spinSpeed = SPIN_SPEED_OPTIONS[sliderIndex] ?? draft.spinSpeed;
                            updateSpinSpeed(spinSpeed, false);
                          }}
                        />
                        <expoSwiftUI.Picker
                          label="Spin direction"
                          options={ROTATION_DIRECTION_OPTIONS.map((option) => option.label)}
                          selectedIndex={Math.max(
                            0,
                            ROTATION_DIRECTION_OPTIONS.findIndex(
                              (option) => option.value === draft.rotationDirection,
                            ),
                          )}
                          variant="segmented"
                          onOptionSelected={(event) => {
                            updateRotationDirection(
                              ROTATION_DIRECTION_OPTIONS[event.nativeEvent.index]?.value ?? "cw",
                            );
                          }}
                        />
                        <expoSwiftUI.LabeledContent label="Spin start angle">
                          <expoSwiftUI.Text>
                            {formatRotationStart(draft.rotationStartDeg)}
                          </expoSwiftUI.Text>
                        </expoSwiftUI.LabeledContent>
                        <expoSwiftUI.Slider
                          min={0}
                          max={ROTATION_START_OPTIONS.length - 1}
                          steps={ROTATION_START_OPTIONS.length - 1}
                          value={findClosestOptionIndex(
                            ROTATION_START_OPTIONS,
                            draft.rotationStartDeg,
                          )}
                          color={colors.accent.primary}
                          onValueChange={(nextValue) => {
                            const sliderIndex = Math.round(
                              clamp(nextValue, 0, ROTATION_START_OPTIONS.length - 1),
                            );
                            const rotationStartDeg =
                              ROTATION_START_OPTIONS[sliderIndex] ?? draft.rotationStartDeg;
                            updateRotationStartDeg(rotationStartDeg, false);
                          }}
                        />
                      </>
                    ) : null}
                  </expoSwiftUI.Section>
                </expoSwiftUI.Form>
              </expoSwiftUI.Host>
            </View>
          ) : (
            <ScrollView
              style={styles.controlsScroll}
              contentContainerStyle={styles.content}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.controlPanel}>
                <View style={styles.controlTabRow}>
                {TEMPLATE_CONTROL_TABS.map((tab) => {
                  const selected = tab.id === activeControlTab;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => handleControlTabSelect(tab.id)}
                      style={[
                        styles.controlTabPill,
                        selected && styles.controlTabPillSelected,
                      ]}
                      accessibilityLabel={`Show ${tab.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.controlTabPillText,
                          selected && styles.controlTabPillTextSelected,
                        ]}
                      >
                        {tab.label}
                      </Text>
                    </Pressable>
                  );
                })}
                </View>

                <View style={styles.controlPanelBody}>
              {activeControlTab === "background" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Background</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.backgroundRow}
                    >
                      {backgroundOptions.map((option) => {
                        const selected = option.color === draft.stageBackgroundColor;
                        return (
                          <Pressable
                            key={option.id}
                            onPress={() => {
                              setIsCustomColorEnabled(false);
                              setLastPresetBackgroundColor(option.color);
                              updateBackground(option.color);
                            }}
                            style={[
                              styles.backgroundSwatchWrap,
                              selected && styles.backgroundSwatchWrapSelected,
                            ]}
                            accessibilityLabel={`Background ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <View
                              style={[
                                styles.backgroundSwatch,
                                { backgroundColor: option.swatch },
                              ]}
                            />
                          </Pressable>
                        );
                      })}
                      <Pressable
                        onPress={() => toggleCustomColorEnabled(!isCustomColorEnabled)}
                        style={[
                          styles.backgroundSwatchWrap,
                          styles.customBackgroundToggleWrap,
                          isCustomColorEnabled && styles.backgroundSwatchWrapSelected,
                        ]}
                        accessibilityLabel="Toggle custom background color"
                        accessibilityRole="button"
                        accessibilityState={{ selected: isCustomColorEnabled }}
                      >
                        <View
                          style={[
                            styles.backgroundSwatch,
                            styles.customBackgroundToggleInner,
                            { backgroundColor: customColor },
                          ]}
                        />
                        <Ionicons
                          name="color-palette"
                          size={11}
                          color="#ffffff"
                          style={styles.customBackgroundToggleIcon}
                        />
                      </Pressable>
                      <Pressable
                        onPress={handlePickBackgroundPhoto}
                        style={[
                          styles.backgroundSwatchWrap,
                          styles.photoBackgroundToggleWrap,
                          isBackgroundPhotoSelected && styles.backgroundSwatchWrapSelected,
                        ]}
                        accessibilityLabel="Add photo background"
                        accessibilityRole="button"
                        accessibilityState={{ selected: isBackgroundPhotoSelected }}
                      >
                        {isBackgroundPhotoLoading ? (
                          <ActivityIndicator size="small" color={colors.dark.text} />
                        ) : draft.stageBackgroundImageUri ? (
                          <RNImage
                            source={{ uri: draft.stageBackgroundImageUri }}
                            style={[styles.backgroundSwatch, styles.photoBackgroundThumb]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.backgroundSwatch,
                              styles.photoBackgroundPlaceholder,
                            ]}
                          >
                            <Ionicons
                              name="image-outline"
                              size={14}
                              color={colors.dark.textSecondary}
                            />
                          </View>
                        )}
                      </Pressable>
                    </ScrollView>
                    {isCustomColorEnabled ? (
                      <View style={styles.customColorCard}>
                        <View style={styles.customColorHeader}>
                          <Text style={styles.customColorTitle}>Custom Color</Text>
                          <View
                            style={[
                              styles.customColorSwatch,
                              { backgroundColor: customColor },
                            ]}
                          />
                        </View>

                        <View style={styles.customHueHeader}>
                          <Text style={styles.customHueLabel}>Palette</Text>
                        </View>
                        <PaletteStrip
                          hue={customHue}
                          saturation={customSaturation}
                          lightness={customLightness}
                          disabled={!isCustomColorEnabled}
                          onSelect={handleCustomPaletteSelect}
                        />

                        {showToneOptions ? (
                          <>
                            <View style={styles.customHueHeader}>
                              <Text style={styles.customHueLabel}>Tone</Text>
                            </View>
                            <ScrollView
                              horizontal
                              nestedScrollEnabled
                              showsHorizontalScrollIndicator={false}
                              contentContainerStyle={styles.customToneRow}
                            >
                              {CUSTOM_TONE_OPTIONS.map((tone, toneIndex) => {
                                const selected = tone === customLightness;
                                const toneColor = hslToHex(customHue, customSaturation, tone);
                                const toneLabel = CUSTOM_TONE_LABELS[toneIndex] ?? "Tone";
                                return (
                                  <Pressable
                                    key={`tone-${tone}`}
                                    onPress={() => handleCustomToneSelect(tone)}
                                    style={[
                                      styles.customToneSwatchWrap,
                                      selected && styles.customToneSwatchWrapSelected,
                                    ]}
                                    accessibilityLabel={`Color tone ${toneLabel}`}
                                    accessibilityRole="button"
                                    accessibilityState={{ selected }}
                                  >
                                    <View
                                      style={[
                                        styles.customToneSwatch,
                                        { backgroundColor: toneColor },
                                      ]}
                                    />
                                  </Pressable>
                                );
                              })}
                            </ScrollView>
                          </>
                        ) : null}
                      </View>
                    ) : null}
                  </View>

                  {isBackgroundPhotoSelected ? (
                    <View style={styles.controlSection}>
                      <View style={styles.controlHeader}>
                        <Text style={styles.controlLabel}>Background Blur</Text>
                      </View>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.optionRow}
                      >
                        {BACKGROUND_BLUR_OPTIONS.map((option) => {
                          const selected = option === draft.backgroundBlur;
                          return (
                            <Pressable
                              key={`blur-${option}`}
                              onPress={() => updateBackgroundBlur(option)}
                              style={[styles.optionPill, selected && styles.optionPillSelected]}
                              accessibilityLabel={`Background blur ${formatBlur(option)}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextSelected,
                                ]}
                              >
                                {formatBlur(option)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              ) : null}

              {activeControlTab === "quickTune" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>{recordSizeControlLabel}</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {RECORD_SIZE_OPTIONS.map((option) => {
                        const selected = option === draft.recordSize;
                        return (
                          <Pressable
                            key={`record-size-${option}`}
                            onPress={() => updateRecordSize(option)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`${recordSizeAccessibilityPrefix} ${formatRecordSize(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatRecordSize(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Transparency</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {RECORD_TRANSPARENCY_OPTIONS.map((option) => {
                        const selected = option === draft.recordTransparency;
                        return (
                          <Pressable
                            key={String(option)}
                            onPress={() => updateRecordTransparency(option)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`Transparency ${Math.round(option * 100)}%`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {`${Math.round(option * 100)}%`}
                            </Text>
                          </Pressable>
                        );
                      })}
                      </ScrollView>
                  </View>
                  {isVinylTemplate ? (
                    <View style={styles.controlSection}>
                      <View style={styles.controlHeader}>
                        <Text style={styles.controlLabel}>Artwork Size</Text>
                      </View>
                      <ScrollView
                        horizontal
                        nestedScrollEnabled
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.optionRow}
                      >
                        {ARTWORK_SCALE_OPTIONS.map((option) => {
                          const selected =
                            option ===
                            (ARTWORK_SCALE_OPTIONS[
                              findClosestOptionIndex(
                                ARTWORK_SCALE_OPTIONS,
                                draft.artworkScale,
                              )
                            ] ?? draft.artworkScale);
                          return (
                            <Pressable
                              key={`artwork-size-${option}`}
                              onPress={() => updateArtworkScale(option)}
                              style={[styles.optionPill, selected && styles.optionPillSelected]}
                              accessibilityLabel={`Artwork size ${formatArtworkScale(option)} ${formatArtworkScalePercent(option)}`}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                            >
                              <Text
                                style={[
                                  styles.optionPillText,
                                  selected && styles.optionPillTextSelected,
                                ]}
                              >
                                {formatArtworkScale(option)}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              ) : null}

              {activeControlTab === "advancedMotion" ? (
                <>
                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Speed</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {SPIN_SPEED_OPTIONS.map((option) => {
                        const selected = option === draft.spinSpeed;
                        return (
                          <Pressable
                            key={String(option)}
                            onPress={() => updateSpinSpeed(option)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`Spin speed ${formatSpeed(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatSpeed(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Start Angle</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {ROTATION_START_OPTIONS.map((option) => {
                        const selected = option === draft.rotationStartDeg;
                        return (
                          <Pressable
                            key={`start-angle-${option}`}
                            onPress={() => updateRotationStartDeg(option)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`Spin start angle ${formatRotationStart(option)}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {formatRotationStart(option)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  <View style={styles.controlSection}>
                    <View style={styles.controlHeader}>
                      <Text style={styles.controlLabel}>Spin Direction</Text>
                    </View>
                    <ScrollView
                      horizontal
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.optionRow}
                    >
                      {ROTATION_DIRECTION_OPTIONS.map((option) => {
                        const selected = option.value === draft.rotationDirection;
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => updateRotationDirection(option.value)}
                            style={[styles.optionPill, selected && styles.optionPillSelected]}
                            accessibilityLabel={`Spin direction ${option.label}`}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                          >
                            <Text
                              style={[
                                styles.optionPillText,
                                selected && styles.optionPillTextSelected,
                              ]}
                            >
                              {option.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                </>
              ) : null}
                </View>
              </View>
            </ScrollView>
          )}

        <View style={styles.footer}>
          <Pressable
            onPress={() => onApply(draft)}
            style={styles.applyButton}
            accessibilityLabel="Apply template controls"
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>Apply Changes</Text>
          </Pressable>
        </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "transparent",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  sheetAnimatedLayer: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  topGestureZone: {
    backgroundColor: colors.dark.background,
  },
  headerGestureArea: {
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  dragHandle: {
    width: 38,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.body,
    color: colors.dark.text,
    fontWeight: "700",
  },
  previewContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  controlsScroll: {
    flex: 1,
  },
  nativeControlsWrap: {
    flex: 1,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
  },
  nativeControlsHost: {
    flex: 1,
    backgroundColor: colors.dark.background,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  controlPanel: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    overflow: "hidden",
  },
  controlTabRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  controlPanelBody: {
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  controlTabPill: {
    flex: 1,
    minHeight: 34,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  controlTabPillSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  controlTabPillText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  controlTabPillTextSelected: {
    color: colors.dark.text,
  },
  previewCard: {
    minHeight: 300,
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  previewTemplateInfoBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.xs,
    right: spacing.xs,
  },
  controlSection: {
    gap: spacing.sm,
  },
  controlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  controlLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    fontWeight: "700",
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  optionPill: {
    minHeight: 34,
    minWidth: 64,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.11)",
    backgroundColor: colors.dark.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillSelected: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary,
  },
  optionPillText: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
  },
  optionPillTextSelected: {
    color: colors.dark.text,
  },
  backgroundRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  backgroundSwatchWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundSwatchWrapSelected: {
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  backgroundSwatch: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
  },
  customBackgroundToggleWrap: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  customBackgroundToggleInner: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.42)",
  },
  customBackgroundToggleIcon: {
    position: "absolute",
  },
  photoBackgroundToggleWrap: {
    borderColor: "rgba(255,255,255,0.3)",
  },
  photoBackgroundPlaceholder: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  photoBackgroundThumb: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
  },
  customColorCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  customColorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  customColorTitle: {
    ...typography.caption,
    color: colors.dark.text,
    fontWeight: "700",
  },
  customColorSwatch: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.28)",
  },
  customHueHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: spacing.sm,
  },
  customHueLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  paletteStripScroll: {
    marginHorizontal: -spacing.xs,
  },
  paletteStripWrap: {
    gap: spacing.xs,
  },
  paletteStripRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  paletteSection: {
    gap: spacing.xs,
  },
  paletteSectionLabel: {
    ...typography.caption,
    color: colors.dark.textSecondary,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    paddingHorizontal: spacing.xs,
  },
  paletteSectionSwatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  paletteSectionDivider: {
    marginTop: spacing.xs,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: spacing.xs,
  },
  paletteDotWrap: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  paletteDotWrapSelected: {
    borderColor: colors.dark.text,
    transform: [{ scale: 1.08 }],
  },
  paletteDotWrapDisabled: {
    opacity: 0.42,
  },
  paletteDot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
  },
  palettePager: {
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: 2,
  },
  palettePagerDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.24)",
  },
  palettePagerDotActive: {
    width: 16,
    backgroundColor: colors.accent.primary,
  },
  customToneRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: spacing.xs,
    paddingRight: spacing.sm,
  },
  customToneSwatchWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  customToneSwatchWrapSelected: {
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  customToneSwatch: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.36)",
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
  },
  applyButton: {
    minHeight: 52,
    borderRadius: radius.md,
    backgroundColor: colors.accent.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  applyButtonText: {
    ...typography.button,
    color: colors.dark.text,
    fontWeight: "700",
  },
});
