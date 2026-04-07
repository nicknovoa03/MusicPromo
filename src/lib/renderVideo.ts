import { Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import { Image, Platform } from "react-native";
import {
  getCenterTextureSpec,
  getSimpleSpinTemplateLayout,
  SIMPLE_SPIN_AMBIENT_GLOW_ALPHA_BYTE,
  SIMPLE_SPIN_AMBIENT_GLOW_HEX,
  SIMPLE_SPIN_STAGE_BACKGROUND_HEX,
  SIMPLE_SPIN_GLOW_ALPHA_BYTE,
  SIMPLE_SPIN_GLOW_HEX,
} from "@/lib/simpleSpinTemplateSpec";
import {
  GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_AMBIENT_GLOW_HEX,
  GRAPHIC_POP_CENTER_RING_ALPHA_BYTE,
  GRAPHIC_POP_CENTER_RING_HEX,
  GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE,
  GRAPHIC_POP_CENTER_SHADOW_HEX,
  GRAPHIC_POP_GLOW_ALPHA_BYTE,
  GRAPHIC_POP_GLOW_HEX,
  GRAPHIC_POP_STAGE_BACKGROUND_HEX,
} from "@/lib/graphicPopTemplateSpec";
import { isBetaWatermarkEnabled } from "@/lib/betaWatermark";
import { isRunningInExpoGo } from "@/lib/runtimeEnvironment";
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  DEFAULT_VINYL_SHELL_SIZE,
  getVinylShellFallbackOrder,
  resolveVinylShellSizeFromArtworkScale,
  VINYL_SHELL_ASSET_MODULES,
  type VinylShellSize,
} from "@/lib/vinylShellAssets";
import {
  getVinylCenterGeometry,
  getVinylEdgeGeometry,
  getVinylEdgeSpec,
  getVinylToneSpec,
  toFfmpegColor,
  type VinylToneId,
} from "@/lib/vinylTemplateSpec";


export interface RenderOptions {
  photoUri: string;
  audioUri: string;
  trimStart: number;
  trimEnd: number;
  aspectRatio: "9:16" | "1:1";
  templateTweaks?: {
    spinSpeed?: number;
    recordSize?: number;
    artworkScale?: number;
    recordTransparency?: number;
    backgroundBlur?: number;
    rotationStartDeg?: number;
    rotationDirection?: "cw" | "ccw";
    stageBackgroundColor?: string | null;
    stageBackgroundImageUri?: string | null;
    showWatermark?: boolean;
  };
  onProgress?: (percent: number) => void;
  debugRenderModeBadge?: boolean;
  fastMode?: boolean;
  outputFileName?: string;
}

type FFmpegKitModule = typeof import("ffmpeg-kit-react-native");
type FFmpegSession = import("ffmpeg-kit-react-native").FFmpegSession;
type Statistics = import("ffmpeg-kit-react-native").Statistics;
type RenderPath = "primary" | "fallback" | "safe_fallback";
let ffmpegModule: FFmpegKitModule | null = null;
let activeRenderSessionId: number | null = null;
let activeRenderToken: symbol | null = null;
let betaWatermarkOverlayInputUriCache: string | null = null;
const vinylShellOverlayInputUriCache: Partial<Record<VinylShellSize, string>> = {};

async function getFFmpegKit(): Promise<FFmpegKitModule> {
  if (isRunningInExpoGo()) {
    throw new Error(
      "Video rendering requires a development build. It cannot run in Expo Go.\n\nRun 'npx expo run:android' or 'npx expo run:ios' to test rendering.",
    );
  }

  if (!ffmpegModule) {
    try {
      ffmpegModule = await import("ffmpeg-kit-react-native");
    } catch (e) {
      throw new Error(
        `FFmpeg-kit failed to load: ${e instanceof Error ? e.message : "Unknown error"}`,
      );
    }
  }
  return ffmpegModule;
}

const OUTPUT_DIMENSIONS = {
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
} as const;

type ExportQualityProfile = "balanced" | "high";

function resolveExportQualityProfile(): ExportQualityProfile {
  const value = process.env.EXPO_PUBLIC_EXPORT_QUALITY_PROFILE
    ?.trim()
    .toLowerCase();
  if (value === "high" || value === "hq" || value === "quality") {
    return "high";
  }
  return "balanced";
}

// Hidden env toggle for quick A/B during development:
// EXPO_PUBLIC_EXPORT_QUALITY_PROFILE=balanced|high
const EXPORT_QUALITY_PROFILE = resolveExportQualityProfile();
const IS_HIGH_QUALITY_EXPORT = EXPORT_QUALITY_PROFILE === "high";
const FPS = IS_HIGH_QUALITY_EXPORT ? 60 : 30;
const FAST_MODE_FPS = IS_HIGH_QUALITY_EXPORT ? 30 : 24;
const FAST_MODE_DIMENSION_SCALE = 0.34;
const DEFAULT_HIGH_QUALITY_VIDEO_BITRATE = IS_HIGH_QUALITY_EXPORT ? "12M" : "8M";
const FAST_MODE_VIDEO_BITRATE = "1.2M";
const AUDIO_BITRATE = IS_HIGH_QUALITY_EXPORT ? "256k" : "192k";
const PHOTO_INPUT_RANGE = "pc";
const VIDEO_OUTPUT_RANGE = "tv";
const BASE_SPIN_ROTATION_SECONDS = 4;
const MIN_SPIN_SPEED = 0.25;
const MAX_SPIN_SPEED = 4;
const MIN_RECORD_SIZE = 0.75;
const MAX_RECORD_SIZE = 1.3;
const MIN_ARTWORK_SCALE = 1;
const MAX_ARTWORK_SCALE = 5;
const MIN_RECORD_TRANSPARENCY = 0;
const MAX_RECORD_TRANSPARENCY = 0.65;
const MIN_BACKGROUND_BLUR = 0;
const MAX_BACKGROUND_BLUR = 24;
const MIN_ROTATION_START_DEG = -180;
const MAX_ROTATION_START_DEG = 180;
const ENABLE_BETA_WATERMARK = isBetaWatermarkEnabled();
const BETA_WATERMARK_IMAGE_MODULE = require("../../assets/branding/MusicPromo-Logo.png");

const RENDER_PATH_COLORS: Record<RenderPath, string> = {
  primary: "#38d17b",
  fallback: "#f5b941",
  safe_fallback: "#f06767",
};

const RENDER_PATH_BARS: Record<RenderPath, number> = {
  primary: 1,
  fallback: 2,
  safe_fallback: 3,
};

type RenderVariantId = "simple-spin" | "graphic-pop" | "whole";

const HIGH_QUALITY_VIDEO_BITRATE_BY_VARIANT: Record<RenderVariantId, string> =
  IS_HIGH_QUALITY_EXPORT
    ? {
        "simple-spin": "10M",
        "graphic-pop": "11M",
        whole: "12M",
      }
    : {
        "simple-spin": "7M",
        "graphic-pop": "8M",
        whole: "8M",
      };

type RenderVariantConfig = {
  toneId: VinylToneId;
  stageBackgroundHex: string;
  discBaseHex: string;
  glowHex: string;
  glowAlphaByte: number;
  ambientGlowHex: string;
  ambientGlowAlphaByte: number;
  useCenterLabelArtwork: boolean;
  includeVinylGrooves: boolean;
  grooveLightHex: string;
  grooveLightAlphaByte: number;
  grooveDarkHex: string;
  grooveDarkAlphaByte: number;
  includeCdSheen: boolean;
  includeCenterTexture: boolean;
  centerRingHex: string;
  centerRingAlphaByte: number;
  centerShadowHex: string;
  centerShadowAlphaByte: number;
};

const RENDER_VARIANTS: Record<RenderVariantId, RenderVariantConfig> = {
  "simple-spin": {
    toneId: "simple-spin",
    stageBackgroundHex: SIMPLE_SPIN_STAGE_BACKGROUND_HEX,
    discBaseHex: "#121318",
    glowHex: SIMPLE_SPIN_GLOW_HEX,
    glowAlphaByte: SIMPLE_SPIN_GLOW_ALPHA_BYTE,
    ambientGlowHex: SIMPLE_SPIN_AMBIENT_GLOW_HEX,
    ambientGlowAlphaByte: SIMPLE_SPIN_AMBIENT_GLOW_ALPHA_BYTE,
    useCenterLabelArtwork: true,
    includeVinylGrooves: true,
    grooveLightHex: "#f3f7ff",
    grooveLightAlphaByte: 26,
    grooveDarkHex: "#000000",
    grooveDarkAlphaByte: 42,
    includeCdSheen: false,
    includeCenterTexture: false,
    centerRingHex: "#ffffff",
    centerRingAlphaByte: 0,
    centerShadowHex: "#000000",
    centerShadowAlphaByte: 0,
  },
  "graphic-pop": {
    toneId: "graphic-pop",
    stageBackgroundHex: GRAPHIC_POP_STAGE_BACKGROUND_HEX,
    discBaseHex: "#d4d9e0",
    glowHex: GRAPHIC_POP_GLOW_HEX,
    glowAlphaByte: GRAPHIC_POP_GLOW_ALPHA_BYTE,
    ambientGlowHex: GRAPHIC_POP_AMBIENT_GLOW_HEX,
    ambientGlowAlphaByte: GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
    useCenterLabelArtwork: false,
    includeVinylGrooves: false,
    grooveLightHex: "#ffffff",
    grooveLightAlphaByte: 0,
    grooveDarkHex: "#000000",
    grooveDarkAlphaByte: 0,
    includeCdSheen: false,
    includeCenterTexture: false,
    centerRingHex: GRAPHIC_POP_CENTER_RING_HEX,
    centerRingAlphaByte: GRAPHIC_POP_CENTER_RING_ALPHA_BYTE,
    centerShadowHex: GRAPHIC_POP_CENTER_SHADOW_HEX,
    centerShadowAlphaByte: GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE,
  },
  whole: {
    toneId: "graphic-pop",
    stageBackgroundHex: GRAPHIC_POP_STAGE_BACKGROUND_HEX,
    discBaseHex: "#d4d9e0",
    glowHex: GRAPHIC_POP_GLOW_HEX,
    glowAlphaByte: 0,
    ambientGlowHex: GRAPHIC_POP_AMBIENT_GLOW_HEX,
    ambientGlowAlphaByte: 0,
    useCenterLabelArtwork: false,
    includeVinylGrooves: false,
    grooveLightHex: "#ffffff",
    grooveLightAlphaByte: 0,
    grooveDarkHex: "#000000",
    grooveDarkAlphaByte: 0,
    includeCdSheen: false,
    includeCenterTexture: false,
    centerRingHex: GRAPHIC_POP_CENTER_RING_HEX,
    centerRingAlphaByte: 0,
    centerShadowHex: GRAPHIC_POP_CENTER_SHADOW_HEX,
    centerShadowAlphaByte: 0,
  },
};

type RenderModeBadgeGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  dotSize: number;
  dotX: number;
  dotY: number;
  barWidth: number;
  barHeight: number;
  barGap: number;
  barStartX: number;
  barY: number;
};

function getRenderModeBadgeGeometry(
  width: number,
  height: number,
): RenderModeBadgeGeometry {
  const badgeWidth = Math.max(Math.round(width * 0.24), 188);
  const badgeHeight = Math.max(Math.round(height * 0.042), 46);
  const badgeX = Math.max(Math.round(width * 0.03), 16);
  const badgeY = Math.max(Math.round(height * 0.024), 16);
  const dotSize = Math.max(Math.round(badgeHeight * 0.34), 14);
  const dotX = badgeX + Math.round(badgeHeight * 0.28);
  const dotY = badgeY + Math.round((badgeHeight - dotSize) / 2);
  const barWidth = Math.max(Math.round(badgeHeight * 0.12), 6);
  const barGap = Math.max(Math.round(barWidth * 0.7), 4);
  const barHeight = Math.max(Math.round(badgeHeight * 0.42), 16);
  const barStartX = dotX + dotSize + Math.round(badgeHeight * 0.28);
  const barY = badgeY + Math.round((badgeHeight - barHeight) / 2);

  return {
    x: badgeX,
    y: badgeY,
    width: badgeWidth,
    height: badgeHeight,
    dotSize,
    dotX,
    dotY,
    barWidth,
    barHeight,
    barGap,
    barStartX,
    barY,
  };
}

function buildRenderModeBadgeFilterGraph(params: {
  inputLabel: string;
  width: number;
  height: number;
  mode: RenderPath;
  enabled: boolean;
  watermarkEnabled: boolean;
  watermarkInputLabel?: string | null;
}): string[] {
  const {
    inputLabel,
    width,
    height,
    mode,
    enabled,
    watermarkEnabled,
    watermarkInputLabel,
  } = params;
  if (!enabled) {
    return buildWatermarkFilterGraph({
      inputLabel,
      width,
      height,
      enabled: watermarkEnabled,
      watermarkInputLabel,
    });
  }

  const geometry = getRenderModeBadgeGeometry(width, height);
  const color = RENDER_PATH_COLORS[mode];
  const bars = RENDER_PATH_BARS[mode];
  const lines = [
    `${inputLabel}drawbox=x=${geometry.x}:y=${geometry.y}:w=${geometry.width}:h=${geometry.height}:color=black@0.45:t=fill[mode_badge_0]`,
    `[mode_badge_0]drawbox=x=${geometry.dotX}:y=${geometry.dotY}:w=${geometry.dotSize}:h=${geometry.dotSize}:color=${color}@0.98:t=fill[mode_badge_1]`,
  ];

  let currentLabel = "[mode_badge_1]";
  for (let index = 0; index < bars; index += 1) {
    const nextLabel = `[mode_badge_${index + 2}]`;
    const barX = geometry.barStartX + index * (geometry.barWidth + geometry.barGap);
    lines.push(
      `${currentLabel}drawbox=x=${barX}:y=${geometry.barY}:w=${geometry.barWidth}:h=${geometry.barHeight}:color=white@0.92:t=fill${nextLabel}`,
    );
    currentLabel = nextLabel;
  }

  lines.push(
    `${currentLabel}drawbox=x=${geometry.x}:y=${geometry.y}:w=${geometry.width}:h=${geometry.height}:color=white@0.28:t=2[mode_badge_out]`,
  );
  lines.push(
    ...buildWatermarkFilterGraph({
      inputLabel: "[mode_badge_out]",
      width,
      height,
      enabled: watermarkEnabled,
      watermarkInputLabel,
    }),
  );
  return lines;
}

function buildWatermarkFilterGraph(params: {
  inputLabel: string;
  width: number;
  height: number;
  enabled: boolean;
  watermarkInputLabel?: string | null;
}): string[] {
  const { inputLabel, width, enabled, watermarkInputLabel } = params;
  if (!enabled || !watermarkInputLabel) {
    return [`${inputLabel}scale=iw:ih:out_color_matrix=bt709:out_range=full,format=yuv420p[out]`];
  }

  const watermarkWidth = Math.round(width * 0.13);
  const inset = Math.max(8, Math.round(width * 0.03));

  return [
    `${watermarkInputLabel}format=rgba,scale=${watermarkWidth}:-1[watermark_scaled]`,
    `${inputLabel}[watermark_scaled]overlay=x=(W-w)/2:y=${inset}:format=auto:eof_action=repeat[watermark_out]`,
    "[watermark_out]scale=iw:ih:out_color_matrix=bt709:out_range=full,format=yuv420p[out]",
  ];
}

function buildPhotoScaleCropFilter(width: number, height: number): string {
  return (
    `scale=${width}:${height}:force_original_aspect_ratio=increase:` +
    `in_range=${PHOTO_INPUT_RANGE}:out_range=${VIDEO_OUTPUT_RANGE},` +
    `crop=${width}:${height}`
  );
}

function buildSafeFallbackVideoFilter(params: {
  width: number;
  height: number;
  mode: RenderPath;
  enabled: boolean;
}): string {
  const { width, height, mode, enabled } = params;
  const filters = [buildPhotoScaleCropFilter(width, height)];

  if (enabled) {
    const geometry = getRenderModeBadgeGeometry(width, height);
    const color = RENDER_PATH_COLORS[mode];
    const bars = RENDER_PATH_BARS[mode];

    filters.push(
      `drawbox=x=${geometry.x}:y=${geometry.y}:w=${geometry.width}:h=${geometry.height}:color=black@0.45:t=fill`,
      `drawbox=x=${geometry.dotX}:y=${geometry.dotY}:w=${geometry.dotSize}:h=${geometry.dotSize}:color=${color}@0.98:t=fill`,
    );

    for (let index = 0; index < bars; index += 1) {
      const barX = geometry.barStartX + index * (geometry.barWidth + geometry.barGap);
      filters.push(
        `drawbox=x=${barX}:y=${geometry.barY}:w=${geometry.barWidth}:h=${geometry.barHeight}:color=white@0.92:t=fill`,
      );
    }

    filters.push(
      `drawbox=x=${geometry.x}:y=${geometry.y}:w=${geometry.width}:h=${geometry.height}:color=white@0.28:t=2`,
    );
  }

  filters.push("scale=iw:ih:out_color_matrix=bt709:out_range=full,format=yuv420p");
  return filters.join(",");
}

function buildVideoEncodeArgs(
  mode: "hardware" | "software",
  options?: { fastMode?: boolean; highQualityVideoBitrate?: string },
): string[] {
  const highQualityVideoBitrate =
    options?.highQualityVideoBitrate ?? DEFAULT_HIGH_QUALITY_VIDEO_BITRATE;
  const videoBitrate = options?.fastMode
    ? FAST_MODE_VIDEO_BITRATE
    : highQualityVideoBitrate;
  if (mode === "hardware" && Platform.OS === "ios") {
    return [
      "-c:v",
      "h264_videotoolbox",
      "-b:v",
      videoBitrate,
      "-pix_fmt",
      "yuv420p",
      "-tag:v",
      "avc1",
      "-colorspace",
      "bt709",
      "-color_primaries",
      "bt709",
      "-color_trc",
      "bt709",
      "-color_range",
      "2",
    ];
  }

  return [
    "-c:v",
    "mpeg4",
    "-b:v",
    videoBitrate,
    "-colorspace",
    "bt709",
    "-color_primaries",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_range",
    "2",
  ];
}

function extensionFromUri(uri: string): string {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const fileName = withoutQuery.split("/").pop() ?? "";
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  const ext = fileName.slice(dot + 1).toLowerCase();
  return /^[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

function clampNumber(
  value: number | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(value as number, max));
}

function sanitizeHexColor(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

function sanitizeRotationDirection(value?: string | null): "cw" | "ccw" {
  return value === "ccw" ? "ccw" : "cw";
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid hex color "${hex}".`);
  }
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function formatScheme(uri: string): string {
  const idx = uri.indexOf(":");
  return idx > 0 ? uri.slice(0, idx) : "unknown";
}

async function ensureRenderableInputUri(
  uri: string,
  kind: "photo" | "audio",
): Promise<string> {
  const normalizedUri = normalizeMediaUri(uri);
  if (!normalizedUri.trim()) {
    throw new Error(`Missing ${kind} file.`);
  }

  if (normalizedUri.startsWith("file://")) {
    try {
      const info = await LegacyFileSystem.getInfoAsync(normalizedUri);
      if (info.exists) {
        return normalizedUri;
      }
    } catch {
      // Fall through and attempt a local copy below.
    }
  }

  if (!LegacyFileSystem.cacheDirectory) {
    throw new Error(
      `Unable to access app cache while preparing ${kind} media for rendering.`,
    );
  }

  const sourceExt = extensionFromUri(normalizedUri);
  const fallbackExt = kind === "photo" ? "jpg" : "m4a";
  const ext = sourceExt || fallbackExt;
  const copiedUri = `${LegacyFileSystem.cacheDirectory}render-${kind}-${Date.now()}-${Math.floor(
    Math.random() * 1_000_000,
  )}.${ext}`;

  try {
    await LegacyFileSystem.copyAsync({ from: normalizedUri, to: copiedUri });
  } catch {
    throw new Error(
      `Unable to read selected ${kind} for rendering (scheme: ${formatScheme(normalizedUri)}). Re-select the ${kind} and try again.`,
    );
  }

  const copiedInfo = await LegacyFileSystem.getInfoAsync(copiedUri);
  if (!copiedInfo.exists) {
    throw new Error(
      `Prepared ${kind} file is missing after copy. Re-select the ${kind} and try again.`,
    );
  }

  return copiedUri;
}

async function getBetaWatermarkOverlayInputUri(): Promise<string> {
  if (betaWatermarkOverlayInputUriCache) {
    try {
      const cachedInfo = await LegacyFileSystem.getInfoAsync(
        betaWatermarkOverlayInputUriCache,
      );
      if (cachedInfo.exists) {
        return betaWatermarkOverlayInputUriCache;
      }
    } catch {
      // Fall through and refresh cache.
    }
    betaWatermarkOverlayInputUriCache = null;
  }

  const resolvedAsset = Image.resolveAssetSource(BETA_WATERMARK_IMAGE_MODULE);
  const assetUri = normalizeMediaUri(resolvedAsset?.uri ?? "");
  if (!assetUri.trim()) {
    throw new Error("Unable to load beta watermark asset.");
  }

  if (/^https?:\/\//i.test(assetUri)) {
    if (!LegacyFileSystem.cacheDirectory) {
      throw new Error("Unable to access app cache for beta watermark download.");
    }

    const downloadUri = `${LegacyFileSystem.cacheDirectory}musicpromo-logo-overlay.png`;
    try {
      await LegacyFileSystem.downloadAsync(assetUri, downloadUri);
    } catch {
      throw new Error(
        "Unable to download beta watermark asset for rendering.",
      );
    }
    betaWatermarkOverlayInputUriCache = downloadUri;
    return downloadUri;
  }

  // Non-HTTP (production bundle path): always copy to cache so FFmpeg can
  // reliably read it — bundle paths are not guaranteed to be accessible from
  // FFmpeg's file I/O context.
  if (!LegacyFileSystem.cacheDirectory) {
    throw new Error("Unable to access app cache for beta watermark asset.");
  }
  const copiedUri = `${LegacyFileSystem.cacheDirectory}musicpromo-logo-overlay.png`;
  try {
    await LegacyFileSystem.copyAsync({ from: assetUri, to: copiedUri });
  } catch {
    throw new Error("Unable to copy beta watermark asset to cache.");
  }
  betaWatermarkOverlayInputUriCache = copiedUri;
  return copiedUri;
}

async function getVinylShellOverlayInputUri(
  size: VinylShellSize,
): Promise<string> {
  const cachedUri = vinylShellOverlayInputUriCache[size];
  if (cachedUri) {
    try {
      const existingInfo = await LegacyFileSystem.getInfoAsync(cachedUri);
      if (existingInfo.exists) {
        return cachedUri;
      }
    } catch {
      // Fall through and refresh cache.
    }
    delete vinylShellOverlayInputUriCache[size];
  }

  const resolvedAsset = Image.resolveAssetSource(VINYL_SHELL_ASSET_MODULES[size]);
  const assetUri = normalizeMediaUri(resolvedAsset?.uri ?? "");
  if (!assetUri.trim()) {
    throw new Error(`Unable to load vinyl shell asset (${size}).`);
  }

  if (/^https?:\/\//i.test(assetUri)) {
    if (!LegacyFileSystem.cacheDirectory) {
      throw new Error("Unable to access app cache for vinyl shell download.");
    }
    const downloadUri = `${LegacyFileSystem.cacheDirectory}vinyl-shell-${size}-${Date.now()}-${Math.floor(
      Math.random() * 1_000_000,
    )}.png`;
    try {
      await LegacyFileSystem.downloadAsync(assetUri, downloadUri);
    } catch {
      throw new Error(`Unable to download vinyl shell asset (${size}).`);
    }
    vinylShellOverlayInputUriCache[size] = downloadUri;
    return downloadUri;
  }

  // Non-HTTP (production bundle path): always copy to cache so FFmpeg can
  // reliably read it — bundle paths are not guaranteed to be accessible from
  // FFmpeg's file I/O context.
  if (!LegacyFileSystem.cacheDirectory) {
    throw new Error("Unable to access app cache for vinyl shell asset.");
  }
  const copiedUri = `${LegacyFileSystem.cacheDirectory}vinyl-shell-${size}-${Date.now()}-${Math.floor(
    Math.random() * 1_000_000,
  )}.png`;
  try {
    await LegacyFileSystem.copyAsync({ from: assetUri, to: copiedUri });
  } catch {
    throw new Error(`Unable to copy vinyl shell asset (${size}) to cache.`);
  }
  vinylShellOverlayInputUriCache[size] = copiedUri;
  return copiedUri;
}

function summarizeFfmpegLogs(logs: string): string {
  if (!logs.trim()) return "";
  const lines = logs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return lines.slice(-6).join(" | ");
}

function sanitizeOutputBaseName(value?: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "musicpromo";
  const withoutExtension = trimmed.replace(/\.[a-z0-9]{1,8}$/i, "");
  const asciiOnly = withoutExtension.normalize("NFKD").replace(/[^\x00-\x7F]/g, "");
  const slug = asciiOnly
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "musicpromo";
}

function formatFileTimestamp(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const year = String(value.getFullYear()).slice(-2);
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  const seconds = String(value.getSeconds()).padStart(2, "0");
  const milliseconds = String(value.getMilliseconds()).padStart(3, "0");
  return `${month}${day}${year}_${hours}${minutes}${seconds}${milliseconds}`;
}

export async function cancelCurrentRender() {
  try {
    const { FFmpegKit } = await getFFmpegKit();
    if (activeRenderSessionId === null) {
      activeRenderToken = null;
      return;
    } else {
      await FFmpegKit.cancel(activeRenderSessionId);
    }
  } catch {
    // Ignore cancellation failures.
  } finally {
    activeRenderSessionId = null;
    activeRenderToken = null;
  }
}

export async function renderSimpleSpinVideo(options: RenderOptions): Promise<string> {
  return renderVinylVideoWithVariant(options, "simple-spin");
}

export async function renderGraphicPopVideo(options: RenderOptions): Promise<string> {
  return renderVinylVideoWithVariant(options, "graphic-pop");
}

export async function renderWholeVideo(options: RenderOptions): Promise<string> {
  return renderVinylVideoWithVariant(options, "whole");
}

export async function warmUpRenderPipeline(): Promise<void> {
  try {
    await getFFmpegKit();
    // Pre-cache vinyl shell assets to eliminate cold start delay on export
    const { getVinylShellFallbackOrder, DEFAULT_VINYL_SHELL_SIZE } = await import(
      "@/lib/vinylShellAssets"
    );
    const shellSizes = getVinylShellFallbackOrder(DEFAULT_VINYL_SHELL_SIZE);
    await Promise.all(
      shellSizes.map((size) =>
        getVinylShellOverlayInputUri(size).catch(() => {
          // Warmup is best-effort — ignore errors
        }),
      ),
    );
  } catch {
    // Warmup is best-effort — ignore errors.
  }
}

async function renderVinylVideoWithVariant(
  options: RenderOptions,
  variantId: RenderVariantId,
): Promise<string> {
  const {
    photoUri,
    audioUri,
    trimStart,
    trimEnd,
    aspectRatio,
    templateTweaks,
    onProgress,
    debugRenderModeBadge = false,
    fastMode = false,
    outputFileName,
  } = options;

  if (!Number.isFinite(trimStart) || !Number.isFinite(trimEnd)) {
    throw new Error("Invalid trim range.");
  }

  const trimStartSec = Math.max(0, trimStart);
  const trimEndSec = trimEnd;
  if (trimEndSec <= trimStartSec) {
    throw new Error("Invalid trim range.");
  }

  const baseDimensions = OUTPUT_DIMENSIONS[aspectRatio];
  const width = fastMode
    ? Math.max(
        2,
        Math.round((baseDimensions.width * FAST_MODE_DIMENSION_SCALE) / 2) * 2,
      )
    : baseDimensions.width;
  const height = fastMode
    ? Math.max(
        2,
        Math.round((baseDimensions.height * FAST_MODE_DIMENSION_SCALE) / 2) * 2,
      )
    : baseDimensions.height;
  const fps = fastMode ? FAST_MODE_FPS : FPS;
  const duration = Math.max(trimEndSec - trimStartSec, 1 / fps);
  const totalFrames = Math.max(Math.round(duration * fps), 1);

  if (activeRenderToken !== null) {
    throw new Error("A video render is already in progress.");
  }

  const renderToken = Symbol(`render-${variantId}`);
  activeRenderToken = renderToken;
  const variant = RENDER_VARIANTS[variantId];
  const resolvedHighQualityVideoBitrate =
    HIGH_QUALITY_VIDEO_BITRATE_BY_VARIANT[variantId] ??
    DEFAULT_HIGH_QUALITY_VIDEO_BITRATE;
  const normalizedSpinSpeed = clampNumber(
    templateTweaks?.spinSpeed,
    MIN_SPIN_SPEED,
    MAX_SPIN_SPEED,
    1,
  );
  const normalizedRecordSize = clampNumber(
    templateTweaks?.recordSize,
    MIN_RECORD_SIZE,
    MAX_RECORD_SIZE,
    1,
  );
  const normalizedArtworkScale = clampNumber(
    templateTweaks?.artworkScale,
    MIN_ARTWORK_SCALE,
    MAX_ARTWORK_SCALE,
    1,
  );
  const artworkScaleProgress =
    (normalizedArtworkScale - MIN_ARTWORK_SCALE) /
    (MAX_ARTWORK_SCALE - MIN_ARTWORK_SCALE);
  const requestedVinylShellSize =
    resolveVinylShellSizeFromArtworkScale(normalizedArtworkScale);
  const normalizedBackgroundBlur = clampNumber(
    templateTweaks?.backgroundBlur,
    MIN_BACKGROUND_BLUR,
    MAX_BACKGROUND_BLUR,
    0,
  );
  const normalizedRotationStartDeg = clampNumber(
    templateTweaks?.rotationStartDeg,
    MIN_ROTATION_START_DEG,
    MAX_ROTATION_START_DEG,
    0,
  );
  const normalizedRotationDirection = sanitizeRotationDirection(
    templateTweaks?.rotationDirection,
  );
  const rotationDirectionMultiplier =
    normalizedRotationDirection === "ccw" ? -1 : 1;
  const rotationStartRadians = (normalizedRotationStartDeg * Math.PI) / 180;
  const spinRotateExpression = `${rotationStartRadians.toFixed(
    6,
  )}+${rotationDirectionMultiplier}*2*PI*t*${normalizedSpinSpeed.toFixed(3)}/${BASE_SPIN_ROTATION_SECONDS}`;
  const normalizedRecordTransparency = clampNumber(
    templateTweaks?.recordTransparency,
    MIN_RECORD_TRANSPARENCY,
    MAX_RECORD_TRANSPARENCY,
    0,
  );
  const normalizedDiscAlpha = 1 - normalizedRecordTransparency;
  const stageBackgroundHex =
    sanitizeHexColor(templateTweaks?.stageBackgroundColor) ??
    variant.stageBackgroundHex;
  const stageBackgroundImageUri = normalizeMediaUri(
    templateTweaks?.stageBackgroundImageUri,
  );
  const shouldShowWatermark = templateTweaks?.showWatermark !== false;
  const backgroundBlurSigma =
    normalizedBackgroundBlur <= 0
      ? 0
      : Math.max(0.8, normalizedBackgroundBlur);
  const layout = getSimpleSpinTemplateLayout({ width, height, aspectRatio });
  const discCenterX = layout.discX + layout.discSize / 2;
  const discCenterY = layout.discY + layout.discSize / 2;
  const discSize = Math.max(
    96,
    Math.round(layout.discSize * normalizedRecordSize),
  );
  const discRadius = Math.round(discSize / 2);
  const discX = Math.round(discCenterX - discSize / 2);
  const discY = Math.round(discCenterY - discSize / 2);

  const glowCenterX = layout.glowX + layout.glowSize / 2;
  const glowCenterY = layout.glowY + layout.glowSize / 2;
  const glowSize = Math.max(
    discSize + 8,
    Math.round(layout.glowSize * normalizedRecordSize),
  );
  const glowRadius = Math.round(glowSize / 2);
  const glowX = Math.round(glowCenterX - glowSize / 2);
  const glowY = Math.round(glowCenterY - glowSize / 2);

  const ambientGlowCenterX = layout.ambientGlowX + layout.ambientGlowSize / 2;
  const ambientGlowCenterY = layout.ambientGlowY + layout.ambientGlowSize / 2;
  const ambientGlowSize = Math.max(
    glowSize + 8,
    Math.round(layout.ambientGlowSize * normalizedRecordSize),
  );
  const ambientGlowRadius = Math.round(ambientGlowSize / 2);
  const ambientGlowX = Math.round(ambientGlowCenterX - ambientGlowSize / 2);
  const ambientGlowY = Math.round(ambientGlowCenterY - ambientGlowSize / 2);
  const vinylTone = getVinylToneSpec(variant.toneId);
  const centerGeometry = getVinylCenterGeometry(variant.toneId, discSize);
  const labelRadius = centerGeometry.labelRadius;
  const holeRadius = centerGeometry.holeRadius;
  const shadeRgb = hexToRgb(vinylTone.shadeHexColor);
  const discBaseRgb = hexToRgb(variant.discBaseHex);
  const glowRgb = hexToRgb(variant.glowHex);
  const ambientGlowRgb = hexToRgb(variant.ambientGlowHex);
  const hasAmbientGlow = variant.ambientGlowAlphaByte > 0;
  const hasDiscGlow = variant.glowAlphaByte > 0;
  const centerRingRgb = hexToRgb(variant.centerRingHex);
  const centerShadowRgb = hexToRgb(variant.centerShadowHex);
  const grooveLightRgb = hexToRgb(variant.grooveLightHex);
  const grooveDarkRgb = hexToRgb(variant.grooveDarkHex);
  const centerTexture = getCenterTextureSpec(discSize);
  const cdOuterRingRadius = Math.round(discRadius * 0.84);
  const cdMidRingRadius = Math.round(discRadius * 0.64);
  const cdInnerRingRadius = Math.round(discRadius * 0.42);
  const edgeSpec = getVinylEdgeSpec();
  const edgeGeometry = getVinylEdgeGeometry(discSize);
  const centerArtworkBaseRadius = Math.max(
    holeRadius * 2.2,
    labelRadius - Math.max(discSize * 0.024, 7) / 2,
  );
  const centerArtworkRadiusMax = Math.min(
    discSize * 0.34,
    edgeGeometry.innerRimInnerRadius - Math.max(discSize * 0.02, 6),
  );
  const centerArtworkRadiusRangeMax = Math.max(
    centerArtworkBaseRadius,
    centerArtworkRadiusMax,
  );
  const centerArtworkRadius = variant.useCenterLabelArtwork
    ? Math.max(
        holeRadius + 2,
        Math.round(
          centerArtworkBaseRadius +
            (centerArtworkRadiusRangeMax - centerArtworkBaseRadius) *
              artworkScaleProgress,
        ),
      ) + 1
    : labelRadius + 1;
  const centerArtworkDiameter = Math.max(centerArtworkRadius * 2, 2);
  const centerArtworkInset = Math.round(
    (discSize - centerArtworkDiameter) / 2,
  );
  const grooveInnerRadius = Math.max(
    centerArtworkRadius + Math.max(Math.round(discSize * 0.02), 6),
    holeRadius + 4,
  );
  const grooveOuterRadius = Math.max(
    grooveInnerRadius + 4,
    edgeGeometry.innerRimInnerRadius,
  );
  const grooveBandSize = Math.max(discSize * 0.0055, 1.2);
  const grooveRadiusExpr = `sqrt(pow(X-${discRadius},2)+pow(Y-${discRadius},2))`;
  const grooveBandOffset = grooveInnerRadius.toFixed(3);
  const grooveBandSizeExpr = grooveBandSize.toFixed(3);
  const grooveOuterRadiusExpr = grooveOuterRadius.toFixed(3);
  const outerRimRgb = hexToRgb(edgeSpec.outerRimHexColor);
  const innerRimRgb = hexToRgb(edgeSpec.innerRimHexColor);

  const preparedPhotoUriPromise = ensureRenderableInputUri(photoUri, "photo");
  const preparedAudioUriPromise = ensureRenderableInputUri(audioUri, "audio");
  const preparedBackgroundUriPromise: Promise<string | null> = stageBackgroundImageUri
    ? ensureRenderableInputUri(stageBackgroundImageUri, "photo").catch(
        (error: unknown) => {
          throw new Error(
            `Unable to read selected background image for rendering. ${error instanceof Error ? error.message : "Please reselect the background image and try again."}`,
          );
        },
      )
    : Promise.resolve(null);
  const [preparedPhotoUri, preparedAudioUri, preparedBackgroundUri] =
    await Promise.all([
      preparedPhotoUriPromise,
      preparedAudioUriPromise,
      preparedBackgroundUriPromise,
    ]);
  const hasBackgroundImage = Boolean(preparedBackgroundUri);
  const audioInputIndex = hasBackgroundImage ? 2 : 1;

  const outputPath = Paths.join(
    Paths.cache,
    `${sanitizeOutputBaseName(outputFileName)}_${formatFileTimestamp(new Date())}.mp4`,
  );
  const renderStartedAt = Date.now();
  let photoInputUriForRender = preparedPhotoUri;
  let watermarkInputUri: string | null = null;
  let vinylShellInputUri: string | null = null;
  let preparedDiscInputUri: string | null = null;
  let activeBackgroundInputUri: string | null = preparedBackgroundUri;
  let isBackgroundBaked = false;
  let selectedVinylShellSize: VinylShellSize = DEFAULT_VINYL_SHELL_SIZE;
  let vinylRenderPathDescriptor = "procedural";
  let exportWatermarkEnabled = false;
  const renderStepTimingsMs: Partial<Record<string, number>> = {};
  const encodeStepLabels: RenderPath[] = ["primary", "fallback", "safe_fallback"];

  const logTimingSummary = (
    completedPath: RenderPath,
    totalElapsedMs: number,
    shellDescriptorOverride?: string,
  ) => {
    if (!__DEV__) return;
    const prepMs = Object.entries(renderStepTimingsMs).reduce((sum, [label, elapsed]) => {
      if (encodeStepLabels.includes(label as RenderPath)) return sum;
      return sum + (elapsed ?? 0);
    }, 0);
    const attemptedEncodeMs = encodeStepLabels.reduce(
      (sum, label) => sum + (renderStepTimingsMs[label] ?? 0),
      0,
    );
    const completedEncodeMs = renderStepTimingsMs[completedPath] ?? 0;
    const shellDescriptor = shellDescriptorOverride ?? vinylRenderPathDescriptor;
    const steps = Object.entries(renderStepTimingsMs)
      .map(([label, elapsed]) => `${label}:${elapsed ?? 0}ms`)
      .join(" | ");
    console.info(
      `[renderVinylVideoWithVariant:${variantId}] Timing summary -> prep=${prepMs}ms encode=${completedEncodeMs}ms attemptedEncode=${attemptedEncodeMs}ms total=${totalElapsedMs}ms path=${completedPath} shell=${shellDescriptor}${steps ? ` steps=${steps}` : ""}`,
    );
  };

  const buildPrimaryFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
    mode: RenderPath,
  ) => {
    const preparedDiscInputLabel = preparedDiscInputUri
      ? `[${audioInputIndex + 1}:v]`
      : null;
    const shellInputLabel =
      !preparedDiscInputLabel && vinylShellInputUri
        ? `[${audioInputIndex + 1}:v]`
        : null;
    const hasSupplementalDiscInput = Boolean(
      preparedDiscInputLabel || shellInputLabel,
    );
    const watermarkInputLabel = exportWatermarkEnabled
      ? `[${audioInputIndex + (hasSupplementalDiscInput ? 2 : 1)}:v]`
      : null;
    const lines: string[] = [];
    const appendStageGlowLayers = () => {
      let stageLabel = "[bg]";
      if (hasAmbientGlow) {
        lines.push(
          `color=c=${toFfmpegColor(variant.ambientGlowHex, 255)}:s=${ambientGlowSize}x${ambientGlowSize}:r=${fps}:d=${duration}[ambient_glow_raw]`,
          `[ambient_glow_raw]format=rgba,geq='r=${ambientGlowRgb.r}:g=${ambientGlowRgb.g}:b=${ambientGlowRgb.b}:a=if(lte(pow(X-${ambientGlowRadius},2)+pow(Y-${ambientGlowRadius},2),pow(${ambientGlowRadius},2)),${variant.ambientGlowAlphaByte},0)'[ambient_glow]`,
          `${stageLabel}[ambient_glow]overlay=${ambientGlowX}:${ambientGlowY}:format=auto[stage_with_ambient]`,
        );
        stageLabel = "[stage_with_ambient]";
      }
      if (hasDiscGlow) {
        lines.push(
          `color=c=${toFfmpegColor(variant.glowHex, 255)}:s=${glowSize}x${glowSize}:r=${fps}:d=${duration}[glow_raw]`,
          `[glow_raw]format=rgba,geq='r=${glowRgb.r}:g=${glowRgb.g}:b=${glowRgb.b}:a=if(lte(pow(X-${glowRadius},2)+pow(Y-${glowRadius},2),pow(${glowRadius},2)),${variant.glowAlphaByte},0)'[glow]`,
          `${stageLabel}[glow]overlay=${glowX}:${glowY}:format=auto[stage_with_glow]`,
        );
        stageLabel = "[stage_with_glow]";
      }
      lines.push(`${stageLabel}format=rgba[scene_0]`);
    };

    if (hasBackgroundImage) {
      if (isBackgroundBaked) {
        lines.push(`[1:v]format=rgba[bg]`);
      } else {
        const blurFilter =
          backgroundBlurSigma > 0
            ? `,gblur=sigma=${backgroundBlurSigma.toFixed(2)}:steps=2`
            : "";
        lines.push(
          `[1:v]${buildPhotoScaleCropFilter(width, height)}${blurFilter}[bg]`,
        );
      }
    } else {
      lines.push(
        `color=c=${toFfmpegColor(stageBackgroundHex, 255)}:s=${width}x${height}:r=${fps}:d=${duration}[bg]`,
      );
    }
    if (!preparedDiscInputLabel) {
      const useSplitDiscSource =
        variantId !== "whole" && variant.useCenterLabelArtwork;
      if (useSplitDiscSource) {
        const artworkSourceSize =
          variantId === "simple-spin" && shellInputLabel
            ? centerArtworkDiameter
            : discSize;
        lines.push(
          `[0:v]${buildPhotoScaleCropFilter(artworkSourceSize, artworkSourceSize)}[label_artwork_raw]`,
        );
      } else {
        lines.push(
          `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[disc_raw]`,
          `[disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[disc_photo_circle]`,
        );
      }
    }
    if (variantId === "whole") {
      if (preparedDiscInputLabel) {
        lines.push(
          `${preparedDiscInputLabel}format=rgba[disc_alpha]`,
          `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
          `[bg][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`,
        );
      } else {
        lines.push(
          `[disc_photo_circle]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[disc_alpha]`,
          `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
          `[bg][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`,
        );
      }
      lines.push(
        ...buildRenderModeBadgeFilterGraph({
          inputLabel: "[scene_1]",
          width,
          height,
          mode,
          enabled: debugRenderModeBadge,
          watermarkEnabled: exportWatermarkEnabled,
          watermarkInputLabel,
        }),
      );
      lines.push(
        `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      );
      return lines.join(";");
    }

    const canUsePreparedVinylDiscPath =
      variantId === "simple-spin" && preparedDiscInputLabel !== null;
    if (canUsePreparedVinylDiscPath && preparedDiscInputLabel) {
      lines.push(
        `${preparedDiscInputLabel}format=rgba[disc_alpha]`,
        `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
      );
      appendStageGlowLayers();
      lines.push(`[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`);
      lines.push(
        ...buildRenderModeBadgeFilterGraph({
          inputLabel: "[scene_1]",
          width,
          height,
          mode,
          enabled: debugRenderModeBadge,
          watermarkEnabled: exportWatermarkEnabled,
          watermarkInputLabel,
        }),
      );
      lines.push(
        `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      );
      return lines.join(";");
    }

    const canUsePreparedCdDiscPath =
      variantId === "graphic-pop" && preparedDiscInputLabel !== null;
    if (canUsePreparedCdDiscPath && preparedDiscInputLabel) {
      lines.push(
        `${preparedDiscInputLabel}format=rgba[disc_alpha]`,
        `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
      );
      appendStageGlowLayers();
      lines.push(`[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`);
      lines.push(
        ...buildRenderModeBadgeFilterGraph({
          inputLabel: "[scene_1]",
          width,
          height,
          mode,
          enabled: debugRenderModeBadge,
          watermarkEnabled: exportWatermarkEnabled,
          watermarkInputLabel,
        }),
      );
      lines.push(
        `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      );
      return lines.join(";");
    }

    const canUseVinylShellPath =
      variantId === "simple-spin" && shellInputLabel !== null;
    if (canUseVinylShellPath && shellInputLabel) {
      lines.push(
        `[label_artwork_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${centerArtworkRadius},2)+pow(Y-${centerArtworkRadius},2),pow(${centerArtworkRadius},2)),if(gte(pow(X-${centerArtworkRadius},2)+pow(Y-${centerArtworkRadius},2),pow(${holeRadius},2)),255,0),0)'[label_artwork]`,
        `color=c=black@0.0:s=${discSize}x${discSize}:r=${fps}:d=${duration}[disc_artwork_base]`,
        `[disc_artwork_base][label_artwork]overlay=${centerArtworkInset}:${centerArtworkInset}:format=auto[disc_artwork]`,
        `${shellInputLabel}format=rgba,scale=${discSize}:${discSize}[vinyl_shell]`,
        `[disc_artwork][vinyl_shell]overlay=0:0:format=auto[disc_shell]`,
        `[disc_shell]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[disc_alpha]`,
        `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
      );
      appendStageGlowLayers();
      lines.push(`[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`);
      lines.push(
        ...buildRenderModeBadgeFilterGraph({
          inputLabel: "[scene_1]",
          width,
          height,
          mode,
          enabled: debugRenderModeBadge,
          watermarkEnabled: exportWatermarkEnabled,
          watermarkInputLabel,
        }),
      );
      lines.push(
        `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      );
      return lines.join(";");
    }

    if (variant.useCenterLabelArtwork) {
      lines.push(
        `color=c=${toFfmpegColor(variant.discBaseHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[disc_base_raw]`,
        `[disc_base_raw]format=rgba,geq='r=${discBaseRgb.r}:g=${discBaseRgb.g}:b=${discBaseRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[disc_base]`,
        `[label_artwork_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${centerArtworkRadius},2)),255,0)'[label_artwork]`,
        `[disc_base][label_artwork]overlay=0:0:format=auto[disc_circle]`,
      );
    } else {
      lines.push("[disc_photo_circle]format=rgba[disc_circle]");
    }

    lines.push(
      `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[disc_shade_raw]`,
      `[disc_shade_raw]format=rgba,geq='r=${shadeRgb.r}:g=${shadeRgb.g}:b=${shadeRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),${vinylTone.shadeAlphaByte},0)'[disc_shade]`,
      `[disc_circle][disc_shade]overlay=0:0:format=auto[disc_dark]`,
    );

    if (variant.includeCdSheen) {
      lines.push(
        `color=c=#e8f1ff@1.0:s=${discSize}x${discSize}:r=${fps}:d=${duration}[cd_sheen_raw]`,
        `[cd_sheen_raw]format=rgba,geq='r=232:g=241:b=255:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdOuterRingRadius},2)),44,if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdMidRingRadius},2)),26,if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdInnerRingRadius},2)),14,0))),0)'[cd_sheen]`,
        `[disc_dark][cd_sheen]overlay=0:0:format=auto[disc_reflective]`,
      );
    } else {
      lines.push("[disc_dark]format=rgba[disc_reflective]");
    }

    let discBaseLabel = "[disc_reflective]";
    if (variant.includeCenterTexture) {
      lines.push(
        `color=c=${toFfmpegColor(variant.centerShadowHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[center_shadow_raw]`,
        `[center_shadow_raw]format=rgba,geq='r=${centerShadowRgb.r}:g=${centerShadowRgb.g}:b=${centerShadowRgb.b}:a=if(between(pow(X-${discRadius + centerTexture.shadowOffsetX},2)+pow(Y-${discRadius + centerTexture.shadowOffsetY},2),pow(${centerTexture.shadowInnerRadius},2),pow(${centerTexture.shadowOuterRadius},2)),${variant.centerShadowAlphaByte},0)'[center_shadow]`,
        `${discBaseLabel}[center_shadow]overlay=0:0:format=auto[disc_with_center_shadow]`,
        `color=c=${toFfmpegColor(variant.centerRingHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[center_ring_raw]`,
        `[center_ring_raw]format=rgba,geq='r=${centerRingRgb.r}:g=${centerRingRgb.g}:b=${centerRingRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${centerTexture.ringInnerRadius},2),pow(${centerTexture.ringRadius},2)),${variant.centerRingAlphaByte},0)'[center_ring]`,
        `[disc_with_center_shadow][center_ring]overlay=0:0:format=auto[disc_textured]`,
      );
      discBaseLabel = "[disc_textured]";
    }

    lines.push(
      `color=c=${toFfmpegColor(edgeSpec.outerRimHexColor, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[outer_rim_raw]`,
      `[outer_rim_raw]format=rgba,geq='r=${outerRimRgb.r}:g=${outerRimRgb.g}:b=${outerRimRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${edgeGeometry.outerRimInnerRadius.toFixed(3)},2),pow(${discRadius},2)),${edgeSpec.outerRimAlphaByte},0)'[outer_rim]`,
      `${discBaseLabel}[outer_rim]overlay=0:0:format=auto[disc_with_outer_rim]`,
      `color=c=${toFfmpegColor(edgeSpec.innerRimHexColor, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[inner_rim_raw]`,
      `[inner_rim_raw]format=rgba,geq='r=${innerRimRgb.r}:g=${innerRimRgb.g}:b=${innerRimRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${edgeGeometry.innerRimInnerRadius.toFixed(3)},2),pow(${edgeGeometry.innerRimRadius.toFixed(3)},2)),${edgeSpec.innerRimAlphaByte},0)'[inner_rim]`,
      `[disc_with_outer_rim][inner_rim]overlay=0:0:format=auto[disc_with_rims]`,
    );
    discBaseLabel = "[disc_with_rims]";

    if (variant.includeVinylGrooves) {
      const grooveEvenAlphaExpr = `if(lte(${grooveRadiusExpr},${grooveOuterRadiusExpr})*gte(${grooveRadiusExpr},${grooveBandOffset}),if(lt(mod(floor((${grooveRadiusExpr}-${grooveBandOffset})/${grooveBandSizeExpr}),2),1),${variant.grooveLightAlphaByte},0),0)`;
      const grooveOddAlphaExpr = `if(lte(${grooveRadiusExpr},${grooveOuterRadiusExpr})*gte(${grooveRadiusExpr},${grooveBandOffset}),if(gte(mod(floor((${grooveRadiusExpr}-${grooveBandOffset})/${grooveBandSizeExpr}),2),1),${variant.grooveDarkAlphaByte},0),0)`;
      lines.push(
        `color=c=${toFfmpegColor(variant.grooveLightHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[groove_light_raw]`,
        `[groove_light_raw]format=rgba,geq='r=${grooveLightRgb.r}:g=${grooveLightRgb.g}:b=${grooveLightRgb.b}:a=${grooveEvenAlphaExpr}'[groove_light]`,
        `${discBaseLabel}[groove_light]overlay=0:0:format=auto[disc_with_grooves_light]`,
        `color=c=${toFfmpegColor(variant.grooveDarkHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[groove_dark_raw]`,
        `[groove_dark_raw]format=rgba,geq='r=${grooveDarkRgb.r}:g=${grooveDarkRgb.g}:b=${grooveDarkRgb.b}:a=${grooveOddAlphaExpr}'[groove_dark]`,
        `[disc_with_grooves_light][groove_dark]overlay=0:0:format=auto[disc_with_grooves]`,
      );
      discBaseLabel = "[disc_with_grooves]";
    }

    lines.push(
      `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[label_raw]`,
      `[label_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${labelRadius},2)),${vinylTone.labelAlphaByte},0)'[label]`,
      `${discBaseLabel}[label]overlay=0:0:format=auto[disc_labeled]`,
      `[disc_labeled]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${holeRadius},2)),0,if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0))'[disc_with_hole]`,
      `[disc_with_hole]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[disc_alpha]`,
      `[disc_alpha]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
    );
    appendStageGlowLayers();
    lines.push(`[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`);
    lines.push(
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[scene_1]",
        width,
        height,
        mode,
        enabled: debugRenderModeBadge,
        watermarkEnabled: exportWatermarkEnabled,
        watermarkInputLabel,
      }),
    );
    lines.push(
      `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    );

    return lines.join(";");
  };

  const buildSafeFallbackFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) => {
    const watermarkInputLabel = exportWatermarkEnabled
      ? `[${audioInputIndex + 1}:v]`
      : null;
    const lines: string[] = [];
    if (hasBackgroundImage) {
      if (isBackgroundBaked) {
        lines.push(`[1:v]format=rgba[safe_bg]`);
      } else {
        const blurFilter =
          backgroundBlurSigma > 0
            ? `,gblur=sigma=${backgroundBlurSigma.toFixed(2)}:steps=2`
            : "";
        lines.push(
          `[1:v]${buildPhotoScaleCropFilter(width, height)}${blurFilter}[safe_bg]`,
        );
      }
    } else {
      lines.push(
        `color=c=${toFfmpegColor(stageBackgroundHex, 255)}:s=${width}x${height}:r=${fps}:d=${duration}[safe_bg]`,
      );
    }
    const useSafeSplitDiscSource =
      variantId !== "whole" && variant.useCenterLabelArtwork;
    if (useSafeSplitDiscSource) {
      lines.push(
        `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[safe_label_artwork_raw]`,
      );
    } else {
      lines.push(
        `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[safe_disc_raw]`,
        `[safe_disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[safe_disc_photo]`,
      );
    }
    if (variantId === "whole") {
      lines.push(
        `[safe_disc_photo]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[safe_disc_dim]`,
        `[safe_disc_dim]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[safe_disc_rot]`,
        `[safe_bg][safe_disc_rot]overlay=${discX}:${discY}:format=auto[safe_scene]`,
      );
      lines.push(
        ...buildRenderModeBadgeFilterGraph({
          inputLabel: "[safe_scene]",
          width,
          height,
          mode: "safe_fallback",
          enabled: debugRenderModeBadge,
          watermarkEnabled: exportWatermarkEnabled,
          watermarkInputLabel,
        }),
        `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      );
      return lines.join(";");
    }
    if (variant.useCenterLabelArtwork) {
      lines.push(
        `color=c=${toFfmpegColor(variant.discBaseHex, 255)}:s=${discSize}x${discSize}:r=${fps}:d=${duration}[safe_disc_base_raw]`,
        `[safe_disc_base_raw]format=rgba,geq='r=${discBaseRgb.r}:g=${discBaseRgb.g}:b=${discBaseRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[safe_disc_base]`,
        `[safe_label_artwork_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${centerArtworkRadius},2)),255,0)'[safe_label_artwork]`,
        `[safe_disc_base][safe_label_artwork]overlay=0:0:format=auto[safe_disc]`,
      );
    } else {
      lines.push("[safe_disc_photo]format=rgba[safe_disc]");
    }
    if (hasAmbientGlow) {
      lines.push(
        `color=c=${toFfmpegColor(variant.ambientGlowHex, 255)}:s=${ambientGlowSize}x${ambientGlowSize}:r=${fps}:d=${duration}[safe_ambient_glow_raw]`,
        `[safe_ambient_glow_raw]format=rgba,geq='r=${ambientGlowRgb.r}:g=${ambientGlowRgb.g}:b=${ambientGlowRgb.b}:a=if(lte(pow(X-${ambientGlowRadius},2)+pow(Y-${ambientGlowRadius},2),pow(${ambientGlowRadius},2)),${variant.ambientGlowAlphaByte},0)'[safe_ambient_glow]`,
        `[safe_bg][safe_ambient_glow]overlay=${ambientGlowX}:${ambientGlowY}:format=auto[safe_scene_0]`,
      );
    } else {
      lines.push("[safe_bg]format=rgba[safe_scene_0]");
    }
    lines.push(
      `[safe_disc]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${holeRadius},2)),0,if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0))'[safe_disc_with_hole]`,
      `[safe_disc_with_hole]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[safe_disc_dim]`,
      `[safe_scene_0][safe_disc_dim]overlay=${discX}:${discY}:format=auto[safe_scene]`,
    );
    lines.push(
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[safe_scene]",
        width,
        height,
        mode: "safe_fallback",
        enabled: debugRenderModeBadge,
        watermarkEnabled: exportWatermarkEnabled,
        watermarkInputLabel,
      }),
      `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    );
    return lines.join(";");
  };

  const buildPrimaryCommand = (
    audioInputUri: string,
    backgroundInputUri: string | null,
    shellOverlayUri: string | null,
    watermarkOverlayUri: string | null,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
    mode: RenderPath,
    encoder: "hardware" | "software",
  ) => {
    const args = [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-i",
      photoInputUriForRender,
    ];
    if (backgroundInputUri) {
      args.push(
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-i",
        backgroundInputUri,
      );
    }
    args.push(
      "-i",
      audioInputUri,
    );
    if (shellOverlayUri) {
      args.push(
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-i",
        shellOverlayUri,
      );
    }
    if (watermarkOverlayUri) {
      args.push("-i", watermarkOverlayUri);
    }
    args.push(
      "-filter_complex",
      buildPrimaryFilterComplex(audioTrimStartSec, audioTrimEndSec, mode),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs(encoder, {
        fastMode,
        highQualityVideoBitrate: resolvedHighQualityVideoBitrate,
      }),
      "-c:a",
      "aac",
      "-b:a",
      AUDIO_BITRATE,
      "-fps_mode",
      "cfr",
      "-r",
      String(fps),
      "-t",
      String(duration),
      "-shortest",
      outputPath,
    );
    return args;
  };

  const buildSafeFallbackCommand = (
    audioInputUri: string,
    backgroundInputUri: string | null,
    watermarkOverlayUri: string | null,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) => {
    const args = [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-i",
      photoInputUriForRender,
    ];
    if (backgroundInputUri) {
      args.push(
        "-loop",
        "1",
        "-framerate",
        String(fps),
        "-i",
        backgroundInputUri,
      );
    }
    args.push(
      "-i",
      audioInputUri,
    );
    if (watermarkOverlayUri) {
      args.push("-i", watermarkOverlayUri);
    }
    args.push(
      "-filter_complex",
      buildSafeFallbackFilterComplex(audioTrimStartSec, audioTrimEndSec),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs("software", {
        fastMode,
        highQualityVideoBitrate: resolvedHighQualityVideoBitrate,
      }),
      "-c:a",
      "aac",
      "-b:a",
      AUDIO_BITRATE,
      "-fps_mode",
      "cfr",
      "-r",
      String(fps),
      "-t",
      String(duration),
      "-shortest",
      outputPath,
    );
    return args;
  };

  const buildEmergencyFallbackCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) => {
    const args = [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-i",
      photoInputUriForRender,
      "-i",
      audioInputUri,
      "-filter_complex",
      `[0:v]${buildPhotoScaleCropFilter(width, height)},scale=iw:ih:out_color_matrix=bt709:out_range=full,format=yuv420p[out];` +
        `[1:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs("software", {
        fastMode,
        highQualityVideoBitrate: resolvedHighQualityVideoBitrate,
      }),
      "-c:a",
      "aac",
      "-b:a",
      AUDIO_BITRATE,
      "-fps_mode",
      "cfr",
      "-r",
      String(fps),
      "-t",
      String(duration),
      "-shortest",
      outputPath,
    ];
    return args;
  };

  let statisticsCallback: ((stats: Statistics) => void) | undefined;
  let sessionId: number | null = null;
  let setupProgressInterval: NodeJS.Timeout | null = null;

  if (onProgress) {
    // Auto-progress from 0% to 10% during setup for UX feedback
    let setupProgress = 0;
    setupProgressInterval = setInterval(() => {
      setupProgress += Math.random() * 3;
      if (setupProgress < 10) {
        onProgress(Math.round(setupProgress));
      } else {
        clearInterval(setupProgressInterval!);
        setupProgressInterval = null;
      }
    }, 100);

    statisticsCallback = (stats: Statistics) => {
      if (setupProgressInterval) {
        clearInterval(setupProgressInterval);
        setupProgressInterval = null;
      }
      if (
        sessionId === null ||
        activeRenderToken !== renderToken ||
        activeRenderSessionId !== sessionId
      ) {
        return;
      }
      const frame = stats.getVideoFrameNumber();
      if (!Number.isFinite(frame) || totalFrames <= 0) {
        return;
      }
      const percent = Math.max(
        10,
        Math.min(Math.round((frame / totalFrames) * 100), 99),
      );
      onProgress(percent);
    };
  }

  try {
    const { FFmpegKit, ReturnCode } = await getFFmpegKit();

    if (variantId === "simple-spin") {
      const shellLoadErrors: string[] = [];
      for (const shellSize of getVinylShellFallbackOrder(requestedVinylShellSize)) {
        try {
          vinylShellInputUri = await getVinylShellOverlayInputUri(shellSize);
          selectedVinylShellSize = shellSize;
          break;
        } catch (error) {
          shellLoadErrors.push(
            `${shellSize}:${error instanceof Error ? error.message : "unknown error"}`,
          );
        }
      }
      if (vinylShellInputUri) {
        vinylRenderPathDescriptor = `shell_${selectedVinylShellSize}`;
      }

      if (__DEV__) {
        if (vinylShellInputUri) {
          console.info(
            `[renderVinylVideoWithVariant:${variantId}] Vinyl shell compositing enabled (size=${selectedVinylShellSize}, requested=${requestedVinylShellSize}).`,
          );
        } else if (shellLoadErrors.length > 0) {
          console.warn(
            `[renderVinylVideoWithVariant:${variantId}] Vinyl shell assets unavailable, falling back to procedural render path:`,
            shellLoadErrors.join(" | "),
          );
        }
      }
    }

    if (shouldShowWatermark) {
      try {
        watermarkInputUri = await getBetaWatermarkOverlayInputUri();
      } catch (error) {
        if (__DEV__) {
          console.warn(
            `[renderVinylVideoWithVariant:${variantId}] Beta watermark unavailable; continuing render without watermark.`,
            error,
          );
        }
      }
    }
    exportWatermarkEnabled = shouldShowWatermark && Boolean(watermarkInputUri);

    const runCommand = async (
      commandArguments: string[],
      options?: { withStatistics?: boolean; label?: string },
    ) => {
      const commandStartAt = Date.now();
      let resolveCompletedSession: ((session: FFmpegSession) => void) | undefined;
      const completedSessionPromise = new Promise<FFmpegSession>((resolve) => {
        resolveCompletedSession = resolve;
      });

      const session = await FFmpegKit.executeWithArgumentsAsync(
        commandArguments,
        (completedSession) => {
          resolveCompletedSession?.(completedSession);
        },
        undefined,
        options?.withStatistics === false ? undefined : statisticsCallback,
      );

      sessionId = session.getSessionId();
      activeRenderSessionId = sessionId;

      if (activeRenderToken !== renderToken) {
        await FFmpegKit.cancel(sessionId);
        throw new Error("Rendering was canceled.");
      }

      const completedSession = await completedSessionPromise;
      const returnCode = await completedSession.getReturnCode();
      const logs = await completedSession.getLogsAsString();
      const elapsedMs = Date.now() - commandStartAt;
      const label = options?.label ?? "ffmpeg";
      renderStepTimingsMs[label] = elapsedMs;
      if (__DEV__) {
        const status = ReturnCode.isSuccess(returnCode)
          ? "success"
          : ReturnCode.isCancel(returnCode)
            ? "cancel"
            : "failed";
        console.info(
          `[renderVinylVideoWithVariant:${variantId}] ${label} ${status} (${elapsedMs}ms)`,
        );
      }
      return { returnCode, logs, elapsedMs };
    };

    let audioInputUri = preparedAudioUri;
    let audioTrimStartForRender = trimStartSec;
    let audioTrimEndForRender = trimEndSec;

    const normalizedPhotoPath = Paths.join(
      Paths.cache,
      `photo_norm_${variantId}_${discSize}_${Date.now()}.png`,
    );
    const normalizePhotoCommand = [
      "-y",
      "-i",
      preparedPhotoUri,
      "-vf",
      buildPhotoScaleCropFilter(discSize, discSize),
      "-frames:v",
      "1",
      "-c:v",
      "png",
      "-update",
      "1",
      normalizedPhotoPath,
    ];
    const normalizePhotoResult = await runCommand(normalizePhotoCommand, {
      withStatistics: false,
      label: "normalize_photo",
    });
    if (ReturnCode.isSuccess(normalizePhotoResult.returnCode)) {
      const normalizedPhotoInfo =
        await LegacyFileSystem.getInfoAsync(normalizedPhotoPath);
      if (normalizedPhotoInfo.exists) {
        photoInputUriForRender = normalizedPhotoPath;
      }
    } else if (__DEV__) {
      console.warn(
        `[renderVinylVideoWithVariant:${variantId}] Photo normalization failed, using original photo input:`,
        summarizeFfmpegLogs(normalizePhotoResult.logs),
      );
    }

    if (variantId === "simple-spin" && vinylShellInputUri) {
      const precomposedVinylDiscPath = Paths.join(
        Paths.cache,
        `vinyl_disc_precomp_${selectedVinylShellSize}_${discSize}_${Date.now()}.png`,
      );
      const precomposeVinylDiscCommand = [
        "-y",
        "-i",
        photoInputUriForRender,
        "-i",
        vinylShellInputUri,
        "-filter_complex",
        `[0:v]${buildPhotoScaleCropFilter(centerArtworkDiameter, centerArtworkDiameter)}[precompose_artwork_raw];` +
          `[precompose_artwork_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${centerArtworkRadius},2)+pow(Y-${centerArtworkRadius},2),pow(${centerArtworkRadius},2)),if(gte(pow(X-${centerArtworkRadius},2)+pow(Y-${centerArtworkRadius},2),pow(${holeRadius},2)),255,0),0)'[precompose_artwork];` +
          `color=c=black@0.0:s=${discSize}x${discSize}:d=1[precompose_disc_base];` +
          `[precompose_disc_base][precompose_artwork]overlay=${centerArtworkInset}:${centerArtworkInset}:format=auto[precompose_disc_with_artwork];` +
          `[1:v]format=rgba,scale=${discSize}:${discSize}[precompose_shell];` +
          `[precompose_disc_with_artwork][precompose_shell]overlay=0:0:format=auto[precompose_disc];` +
          `[precompose_disc]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[precompose_out]`,
        "-map",
        "[precompose_out]",
        "-frames:v",
        "1",
        "-update",
        "1",
        precomposedVinylDiscPath,
      ];
      const precomposeResult = await runCommand(precomposeVinylDiscCommand, {
        withStatistics: false,
        label: "precompose_vinyl_disc",
      });
      if (ReturnCode.isSuccess(precomposeResult.returnCode)) {
        const precomposedInfo = await LegacyFileSystem.getInfoAsync(
          precomposedVinylDiscPath,
        );
        if (precomposedInfo.exists) {
          preparedDiscInputUri = precomposedVinylDiscPath;
          vinylRenderPathDescriptor = `precomposed_${selectedVinylShellSize}`;
        }
      } else if (__DEV__) {
        console.warn(
          `[renderVinylVideoWithVariant:${variantId}] Vinyl disc precompose failed, continuing with shell/procedural path:`,
          summarizeFfmpegLogs(precomposeResult.logs),
        );
      }
    }

    if (variantId === "whole") {
      const precomposedWholeDiscPath = Paths.join(
        Paths.cache,
        `whole_disc_precomp_${discSize}_${Date.now()}.png`,
      );
      const precomposeWholeDiscCommand = [
        "-y",
        "-i",
        photoInputUriForRender,
        "-filter_complex",
        `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[whole_disc_raw];` +
          `[whole_disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[whole_disc_circle];` +
          `[whole_disc_circle]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[whole_disc_out]`,
        "-map",
        "[whole_disc_out]",
        "-frames:v",
        "1",
        "-update",
        "1",
        precomposedWholeDiscPath,
      ];
      const precomposeWholeResult = await runCommand(precomposeWholeDiscCommand, {
        withStatistics: false,
        label: "precompose_whole_disc",
      });
      if (ReturnCode.isSuccess(precomposeWholeResult.returnCode)) {
        const precomposedWholeInfo =
          await LegacyFileSystem.getInfoAsync(precomposedWholeDiscPath);
        if (precomposedWholeInfo.exists) {
          preparedDiscInputUri = precomposedWholeDiscPath;
          vinylRenderPathDescriptor = "precomposed_whole";
        }
      } else if (__DEV__) {
        console.warn(
          `[renderVinylVideoWithVariant:${variantId}] Whole disc precompose failed, continuing with procedural path:`,
          summarizeFfmpegLogs(precomposeWholeResult.logs),
        );
      }
    }

    if (variantId === "graphic-pop") {
      const precomposedCdDiscPath = Paths.join(
        Paths.cache,
        `cd_disc_precomp_${discSize}_${Date.now()}.png`,
      );
      const precomposeCdDiscCommand = [
        "-y",
        "-i",
        photoInputUriForRender,
        "-filter_complex",
        `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[cd_disc_raw];` +
          `[cd_disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[cd_disc_photo_circle];` +
          `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${discSize}x${discSize}:d=1[cd_disc_shade_raw];` +
          `[cd_disc_shade_raw]format=rgba,geq='r=${shadeRgb.r}:g=${shadeRgb.g}:b=${shadeRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),${vinylTone.shadeAlphaByte},0)'[cd_disc_shade];` +
          `[cd_disc_photo_circle][cd_disc_shade]overlay=0:0:format=auto[cd_disc_dark];` +
          `color=c=${toFfmpegColor(edgeSpec.outerRimHexColor, 255)}:s=${discSize}x${discSize}:d=1[cd_outer_rim_raw];` +
          `[cd_outer_rim_raw]format=rgba,geq='r=${outerRimRgb.r}:g=${outerRimRgb.g}:b=${outerRimRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${edgeGeometry.outerRimInnerRadius.toFixed(3)},2),pow(${discRadius},2)),${edgeSpec.outerRimAlphaByte},0)'[cd_outer_rim];` +
          `[cd_disc_dark][cd_outer_rim]overlay=0:0:format=auto[cd_disc_outer_rim];` +
          `color=c=${toFfmpegColor(edgeSpec.innerRimHexColor, 255)}:s=${discSize}x${discSize}:d=1[cd_inner_rim_raw];` +
          `[cd_inner_rim_raw]format=rgba,geq='r=${innerRimRgb.r}:g=${innerRimRgb.g}:b=${innerRimRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${edgeGeometry.innerRimInnerRadius.toFixed(3)},2),pow(${edgeGeometry.innerRimRadius.toFixed(3)},2)),${edgeSpec.innerRimAlphaByte},0)'[cd_inner_rim];` +
          `[cd_disc_outer_rim][cd_inner_rim]overlay=0:0:format=auto[cd_disc_rims];` +
          `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${discSize}x${discSize}:d=1[cd_label_raw];` +
          `[cd_label_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${labelRadius},2)),${vinylTone.labelAlphaByte},0)'[cd_label];` +
          `[cd_disc_rims][cd_label]overlay=0:0:format=auto[cd_disc_labeled];` +
          `[cd_disc_labeled]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${holeRadius},2)),0,if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0))'[cd_disc_with_hole];` +
          `[cd_disc_with_hole]format=rgba,colorchannelmixer=aa=${normalizedDiscAlpha.toFixed(3)}[cd_disc_out]`,
        "-map",
        "[cd_disc_out]",
        "-frames:v",
        "1",
        "-update",
        "1",
        precomposedCdDiscPath,
      ];
      const precomposeCdResult = await runCommand(precomposeCdDiscCommand, {
        withStatistics: false,
        label: "precompose_cd_disc",
      });
      if (ReturnCode.isSuccess(precomposeCdResult.returnCode)) {
        const precomposedCdInfo =
          await LegacyFileSystem.getInfoAsync(precomposedCdDiscPath);
        if (precomposedCdInfo.exists) {
          preparedDiscInputUri = precomposedCdDiscPath;
          vinylRenderPathDescriptor = "precomposed_cd";
        }
      } else if (__DEV__) {
        console.warn(
          `[renderVinylVideoWithVariant:${variantId}] CD disc precompose failed, continuing with procedural path:`,
          summarizeFfmpegLogs(precomposeCdResult.logs),
        );
      }
    }

    if (preparedBackgroundUri) {
      const bakedBackgroundPath = Paths.join(
        Paths.cache,
        `bg_baked_${width}x${height}_${Date.now()}.png`,
      );
      const bgBlurFilter =
        backgroundBlurSigma > 0
          ? `,gblur=sigma=${backgroundBlurSigma.toFixed(2)}:steps=2`
          : "";
      const bakeBackgroundCommand = [
        "-y",
        "-i",
        preparedBackgroundUri,
        "-vf",
        `${buildPhotoScaleCropFilter(width, height)}${bgBlurFilter}`,
        "-frames:v",
        "1",
        "-c:v",
        "png",
        "-update",
        "1",
        bakedBackgroundPath,
      ];
      const bakeBackgroundResult = await runCommand(bakeBackgroundCommand, {
        withStatistics: false,
        label: "bake_background",
      });
      if (ReturnCode.isSuccess(bakeBackgroundResult.returnCode)) {
        const bakedInfo = await LegacyFileSystem.getInfoAsync(bakedBackgroundPath);
        if (bakedInfo.exists) {
          activeBackgroundInputUri = bakedBackgroundPath;
          isBackgroundBaked = true;
        }
      } else if (__DEV__) {
        console.warn(
          `[renderVinylVideoWithVariant:${variantId}] Background bake failed, using original background input:`,
          summarizeFfmpegLogs(bakeBackgroundResult.logs),
        );
      }
    }

    if (extensionFromUri(preparedAudioUri) === "mp3") {
      const normalizedAudioPath = Paths.join(
        Paths.cache,
        `audio_norm_${Date.now()}.m4a`,
      );
      const normalizeAudioCommand = [
        "-y",
        "-ss",
        String(trimStartSec),
        "-t",
        String(duration),
        "-i",
        preparedAudioUri,
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-c:a",
        "aac",
        "-b:a",
        AUDIO_BITRATE,
        "-ar",
        "48000",
        "-ac",
        "2",
        normalizedAudioPath,
      ];

      const normalizeResult = await runCommand(normalizeAudioCommand, {
        withStatistics: false,
        label: "normalize_audio_mp3",
      });

      if (ReturnCode.isSuccess(normalizeResult.returnCode)) {
        const normalizedInfo = await LegacyFileSystem.getInfoAsync(normalizedAudioPath);
        if (normalizedInfo.exists) {
          audioInputUri = normalizedAudioPath;
          audioTrimStartForRender = 0;
          audioTrimEndForRender = duration;
        }
      } else if (__DEV__) {
        console.warn(
          `[renderVinylVideoWithVariant:${variantId}] MP3 normalization failed, using original audio input:`,
          summarizeFfmpegLogs(normalizeResult.logs),
        );
      }
    }

    const supplementalDiscInputUri =
      variantId === "simple-spin"
        ? (preparedDiscInputUri ?? vinylShellInputUri)
        : variantId === "whole" || variantId === "graphic-pop"
          ? preparedDiscInputUri
          : null;
    const primaryCommand = buildPrimaryCommand(
      audioInputUri,
      activeBackgroundInputUri,
      supplementalDiscInputUri,
      watermarkInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "primary",
      "hardware",
    );
    const fallbackCommand = buildPrimaryCommand(
      audioInputUri,
      activeBackgroundInputUri,
      supplementalDiscInputUri,
      watermarkInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "fallback",
      "software",
    );
    const safeFallbackCommand = buildSafeFallbackCommand(
      audioInputUri,
      activeBackgroundInputUri,
      watermarkInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
    );

    const primaryResult = await runCommand(primaryCommand, { label: "primary" });
    if (ReturnCode.isSuccess(primaryResult.returnCode)) {
      if (__DEV__) {
        const totalElapsedMs = Date.now() - renderStartedAt;
        console.info(
          `[renderVinylVideoWithVariant:${variantId}] Completed via primary in ${totalElapsedMs}ms (shell=${vinylRenderPathDescriptor}).`,
        );
        logTimingSummary("primary", totalElapsedMs);
      }
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(primaryResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      console.warn(
        `[renderVinylVideoWithVariant:${variantId}] Primary command failed, trying software fallback:`,
        summarizeFfmpegLogs(primaryResult.logs) || "No diagnostic logs.",
      );
    }

    const fallbackResult = await runCommand(fallbackCommand, { label: "fallback" });
    if (ReturnCode.isSuccess(fallbackResult.returnCode)) {
      if (__DEV__) {
        const totalElapsedMs = Date.now() - renderStartedAt;
        console.info(
          `[renderVinylVideoWithVariant:${variantId}] Completed via fallback in ${totalElapsedMs}ms (shell=${vinylRenderPathDescriptor}).`,
        );
        logTimingSummary("fallback", totalElapsedMs);
      }
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(fallbackResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      console.warn(
        `[renderVinylVideoWithVariant:${variantId}] Software fallback failed, trying safe fallback:`,
        summarizeFfmpegLogs(fallbackResult.logs) || "No diagnostic logs.",
      );
    }

    const safeFallbackResult = await runCommand(safeFallbackCommand, {
      label: "safe_fallback",
    });
    if (ReturnCode.isSuccess(safeFallbackResult.returnCode)) {
      if (__DEV__) {
        const totalElapsedMs = Date.now() - renderStartedAt;
        console.info(
          `[renderVinylVideoWithVariant:${variantId}] Completed via safe_fallback in ${totalElapsedMs}ms (shell=procedural-safe).`,
        );
        logTimingSummary("safe_fallback", totalElapsedMs, "procedural-safe");
      }
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(safeFallbackResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      console.error(
        `[renderVinylVideoWithVariant:${variantId}] Safe fallback command failed:`,
        safeFallbackResult.logs,
      );
    }

    const emergencyFallbackResult = await runCommand(
      buildEmergencyFallbackCommand(
        audioInputUri,
        audioTrimStartForRender,
        audioTrimEndForRender,
      ),
      {
        label: "emergency_fallback",
      },
    );
    if (ReturnCode.isSuccess(emergencyFallbackResult.returnCode)) {
      if (__DEV__) {
        const totalElapsedMs = Date.now() - renderStartedAt;
        console.info(
          `[renderVinylVideoWithVariant:${variantId}] Completed via emergency_fallback in ${totalElapsedMs}ms.`,
        );
      }
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(emergencyFallbackResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    const details =
      summarizeFfmpegLogs(emergencyFallbackResult.logs) ||
      summarizeFfmpegLogs(safeFallbackResult.logs) ||
      summarizeFfmpegLogs(fallbackResult.logs) ||
      summarizeFfmpegLogs(primaryResult.logs);
    const diagnostics =
      `photoScheme=${formatScheme(preparedPhotoUri)} audioScheme=${formatScheme(preparedAudioUri)} ` +
      `shell=${vinylRenderPathDescriptor} outputPath=${outputPath} ` +
      `codes=primary:${String(primaryResult.returnCode)} fallback:${String(fallbackResult.returnCode)} ` +
      `safe:${String(safeFallbackResult.returnCode)} emergency:${String(emergencyFallbackResult.returnCode)}`;
    if (details) {
      throw new Error(
        `FFmpeg rendering failed (code ${String(emergencyFallbackResult.returnCode)}). ${details} | ${diagnostics}`,
      );
    }
    throw new Error(
      `FFmpeg rendering failed (code ${String(emergencyFallbackResult.returnCode)}). ${diagnostics}`,
    );
  } finally {
    if (setupProgressInterval) {
      clearInterval(setupProgressInterval);
      setupProgressInterval = null;
    }
    if (activeRenderToken === renderToken) {
      activeRenderSessionId = null;
      activeRenderToken = null;
    }
  }
}
