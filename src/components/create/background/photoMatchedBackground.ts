import { Image as ExpoImage } from "expo-image";
import { toByteArray } from "base64-js";
import { clamp, hexToHsl, hslToHex } from "@/lib/colorUtils";
import type { BackgroundOption } from "./types";

const PHOTO_BACKGROUND_SWATCH_COUNT = 5;

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

export async function buildPhotoMatchedBackgroundOptions(
  photoUri: string,
): Promise<BackgroundOption[] | null> {
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

export function mergeBackgroundPresets(
  ...groups: BackgroundOption[][]
): BackgroundOption[] {
  const merged: BackgroundOption[] = [];
  for (const group of groups) {
    for (const option of group) {
      if (merged.some((entry) => entry.color === option.color)) continue;
      merged.push(option);
    }
  }
  return merged;
}

export function isPresetBackgroundColor(
  color: string | null | undefined,
  options: BackgroundOption[],
): boolean {
  return options.some((option) => option.color === (color ?? null));
}
