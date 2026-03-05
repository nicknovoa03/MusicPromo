import { Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { Platform } from "react-native";
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
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  getVinylCenterGeometry,
  getVinylToneSpec,
  toFfmpegColor,
  type VinylToneId,
} from "@/lib/vinylTemplateSpec";

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

export interface RenderOptions {
  photoUri: string;
  audioUri: string;
  trimStart: number;
  trimEnd: number;
  aspectRatio: "9:16" | "1:1";
  templateTweaks?: {
    spinSpeed?: number;
    recordOpacity?: number;
    backgroundBlur?: number;
    rotationStartDeg?: number;
    rotationDirection?: "cw" | "ccw";
    stageBackgroundColor?: string | null;
    stageBackgroundImageUri?: string | null;
  };
  onProgress?: (percent: number) => void;
  debugRenderModeBadge?: boolean;
  fastMode?: boolean;
}

type FFmpegKitModule = typeof import("ffmpeg-kit-react-native");
type FFmpegSession = import("ffmpeg-kit-react-native").FFmpegSession;
type Statistics = import("ffmpeg-kit-react-native").Statistics;
type RenderPath = "primary" | "fallback" | "safe_fallback";
let ffmpegModule: FFmpegKitModule | null = null;
let activeRenderSessionId: number | null = null;
let activeRenderToken: symbol | null = null;

async function getFFmpegKit(): Promise<FFmpegKitModule> {
  if (isExpoGo()) {
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

const FPS = 30;
const FAST_MODE_FPS = 15;
const FAST_MODE_DIMENSION_SCALE = 0.34;
const HIGH_QUALITY_VIDEO_BITRATE = "8M";
const FAST_MODE_VIDEO_BITRATE = "1.2M";
const AUDIO_BITRATE = "256k";
const PHOTO_INPUT_RANGE = "pc";
const VIDEO_OUTPUT_RANGE = "pc";
const BASE_SPIN_ROTATION_SECONDS = 4;
const MIN_SPIN_SPEED = 0.25;
const MAX_SPIN_SPEED = 4;
const MIN_RECORD_OPACITY = 0.35;
const MAX_RECORD_OPACITY = 1;
const MIN_BACKGROUND_BLUR = 0;
const MAX_BACKGROUND_BLUR = 24;
const MIN_ROTATION_START_DEG = -180;
const MAX_ROTATION_START_DEG = 180;
const OUTER_RIM_ALPHA_BYTE = 97; // rgba(10,14,22,0.38)
const INNER_RIM_ALPHA_BYTE = 36; // rgba(255,255,255,0.14)
const INNER_RIM_DIAMETER_RATIO = 0.955;

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

type RenderVariantId = "simple-spin" | "graphic-pop";

type RenderVariantConfig = {
  toneId: VinylToneId;
  stageBackgroundHex: string;
  glowHex: string;
  glowAlphaByte: number;
  ambientGlowHex: string;
  ambientGlowAlphaByte: number;
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
    glowHex: SIMPLE_SPIN_GLOW_HEX,
    glowAlphaByte: SIMPLE_SPIN_GLOW_ALPHA_BYTE,
    ambientGlowHex: SIMPLE_SPIN_AMBIENT_GLOW_HEX,
    ambientGlowAlphaByte: SIMPLE_SPIN_AMBIENT_GLOW_ALPHA_BYTE,
    includeCdSheen: true,
    includeCenterTexture: false,
    centerRingHex: "#ffffff",
    centerRingAlphaByte: 0,
    centerShadowHex: "#000000",
    centerShadowAlphaByte: 0,
  },
  "graphic-pop": {
    toneId: "graphic-pop",
    stageBackgroundHex: GRAPHIC_POP_STAGE_BACKGROUND_HEX,
    glowHex: GRAPHIC_POP_GLOW_HEX,
    glowAlphaByte: GRAPHIC_POP_GLOW_ALPHA_BYTE,
    ambientGlowHex: GRAPHIC_POP_AMBIENT_GLOW_HEX,
    ambientGlowAlphaByte: GRAPHIC_POP_AMBIENT_GLOW_ALPHA_BYTE,
    includeCdSheen: false,
    includeCenterTexture: true,
    centerRingHex: GRAPHIC_POP_CENTER_RING_HEX,
    centerRingAlphaByte: GRAPHIC_POP_CENTER_RING_ALPHA_BYTE,
    centerShadowHex: GRAPHIC_POP_CENTER_SHADOW_HEX,
    centerShadowAlphaByte: GRAPHIC_POP_CENTER_SHADOW_ALPHA_BYTE,
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
}): string[] {
  const { inputLabel, width, height, mode, enabled } = params;
  if (!enabled) {
    return [`${inputLabel}format=yuv420p[out]`];
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
  lines.push("[mode_badge_out]format=yuv420p[out]");
  return lines;
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

  filters.push("format=yuv420p");
  return filters.join(",");
}

function buildVideoEncodeArgs(
  mode: "hardware" | "software",
  options?: { fastMode?: boolean },
): string[] {
  const videoBitrate = options?.fastMode
    ? FAST_MODE_VIDEO_BITRATE
    : HIGH_QUALITY_VIDEO_BITRATE;
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
    ];
  }

  return ["-c:v", "mpeg4", "-b:v", videoBitrate];
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

function summarizeFfmpegLogs(logs: string): string {
  if (!logs.trim()) return "";
  const lines = logs
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return lines.slice(-6).join(" | ");
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
  const normalizedSpinSpeed = clampNumber(
    templateTweaks?.spinSpeed,
    MIN_SPIN_SPEED,
    MAX_SPIN_SPEED,
    1,
  );
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
  const normalizedRecordOpacity = clampNumber(
    templateTweaks?.recordOpacity,
    MIN_RECORD_OPACITY,
    MAX_RECORD_OPACITY,
    1,
  );
  const stageBackgroundHex =
    sanitizeHexColor(templateTweaks?.stageBackgroundColor) ??
    variant.stageBackgroundHex;
  const stageBackgroundImageUri = normalizeMediaUri(
    templateTweaks?.stageBackgroundImageUri,
  );
  const backgroundBlurSigma =
    normalizedBackgroundBlur <= 0
      ? 0
      : Math.max(0.8, normalizedBackgroundBlur);
  const layout = getSimpleSpinTemplateLayout({ width, height, aspectRatio });
  const {
    discSize,
    discRadius,
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
  } = layout;
  const vinylTone = getVinylToneSpec(variant.toneId);
  const centerGeometry = getVinylCenterGeometry(variant.toneId, discSize);
  const labelRadius = centerGeometry.labelRadius;
  const holeRadius = centerGeometry.holeRadius;
  const shadeRgb = hexToRgb(vinylTone.shadeHexColor);
  const holeRgb = hexToRgb(vinylTone.holeHexColor);
  const glowRgb = hexToRgb(variant.glowHex);
  const ambientGlowRgb = hexToRgb(variant.ambientGlowHex);
  const centerRingRgb = hexToRgb(variant.centerRingHex);
  const centerShadowRgb = hexToRgb(variant.centerShadowHex);
  const centerTexture = getCenterTextureSpec(discSize);
  const cdOuterRingRadius = Math.round(discRadius * 0.84);
  const cdMidRingRadius = Math.round(discRadius * 0.64);
  const cdInnerRingRadius = Math.round(discRadius * 0.42);
  const outerRimWidth = Math.max(discSize * 0.017, 1.2);
  const outerRimInnerRadius = Math.max(discRadius - outerRimWidth, 0);
  const innerRimRadius = (discSize * INNER_RIM_DIAMETER_RATIO) / 2;
  const innerRimThickness = 1;
  const innerRimInnerRadius = Math.max(innerRimRadius - innerRimThickness, 0);

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

  const outputPath = Paths.join(Paths.cache, `export_${Date.now()}.mp4`);
  let photoInputUriForRender = preparedPhotoUri;

  const buildPrimaryFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
    mode: RenderPath,
  ) => {
    const lines: string[] = [];
    if (hasBackgroundImage) {
      const blurFilter =
        backgroundBlurSigma > 0
          ? `,gblur=sigma=${backgroundBlurSigma.toFixed(2)}:steps=2`
          : "";
      lines.push(
        `[1:v]${buildPhotoScaleCropFilter(width, height)}${blurFilter}[bg]`,
      );
    } else {
      lines.push(
        `color=c=${toFfmpegColor(stageBackgroundHex, 255)}:s=${width}x${height}:d=${duration}[bg]`,
      );
    }
    lines.push(
      `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[disc_raw]`,
      `[disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[disc_circle]`,
      `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${discSize}x${discSize}:d=${duration}[disc_shade_raw]`,
      `[disc_shade_raw]format=rgba,geq='r=${shadeRgb.r}:g=${shadeRgb.g}:b=${shadeRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),${vinylTone.shadeAlphaByte},0)'[disc_shade]`,
      `[disc_circle][disc_shade]overlay=0:0:format=auto[disc_dark]`,
    );

    if (variant.includeCdSheen) {
      lines.push(
        `color=c=#e8f1ff@1.0:s=${discSize}x${discSize}:d=${duration}[cd_sheen_raw]`,
        `[cd_sheen_raw]format=rgba,geq='r=232:g=241:b=255:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdOuterRingRadius},2)),44,if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdMidRingRadius},2)),26,if(gte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${cdInnerRingRadius},2)),14,0))),0)'[cd_sheen]`,
        `[disc_dark][cd_sheen]overlay=0:0:format=auto[disc_reflective]`,
      );
    } else {
      lines.push("[disc_dark]format=rgba[disc_reflective]");
    }

    let discBaseLabel = "[disc_reflective]";
    if (variant.includeCenterTexture) {
      lines.push(
        `color=c=${toFfmpegColor(variant.centerShadowHex, 255)}:s=${discSize}x${discSize}:d=${duration}[center_shadow_raw]`,
        `[center_shadow_raw]format=rgba,geq='r=${centerShadowRgb.r}:g=${centerShadowRgb.g}:b=${centerShadowRgb.b}:a=if(between(pow(X-${discRadius + centerTexture.shadowOffsetX},2)+pow(Y-${discRadius + centerTexture.shadowOffsetY},2),pow(${centerTexture.shadowInnerRadius},2),pow(${centerTexture.shadowOuterRadius},2)),${variant.centerShadowAlphaByte},0)'[center_shadow]`,
        `${discBaseLabel}[center_shadow]overlay=0:0:format=auto[disc_with_center_shadow]`,
        `color=c=${toFfmpegColor(variant.centerRingHex, 255)}:s=${discSize}x${discSize}:d=${duration}[center_ring_raw]`,
        `[center_ring_raw]format=rgba,geq='r=${centerRingRgb.r}:g=${centerRingRgb.g}:b=${centerRingRgb.b}:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${centerTexture.ringInnerRadius},2),pow(${centerTexture.ringRadius},2)),${variant.centerRingAlphaByte},0)'[center_ring]`,
        `[disc_with_center_shadow][center_ring]overlay=0:0:format=auto[disc_textured]`,
      );
      discBaseLabel = "[disc_textured]";
    }

    lines.push(
      `color=c=#0a0e16@1.0:s=${discSize}x${discSize}:d=${duration}[outer_rim_raw]`,
      `[outer_rim_raw]format=rgba,geq='r=10:g=14:b=22:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${outerRimInnerRadius.toFixed(3)},2),pow(${discRadius},2)),${OUTER_RIM_ALPHA_BYTE},0)'[outer_rim]`,
      `${discBaseLabel}[outer_rim]overlay=0:0:format=auto[disc_with_outer_rim]`,
      `color=c=#ffffff@1.0:s=${discSize}x${discSize}:d=${duration}[inner_rim_raw]`,
      `[inner_rim_raw]format=rgba,geq='r=255:g=255:b=255:a=if(between(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${innerRimInnerRadius.toFixed(3)},2),pow(${innerRimRadius.toFixed(3)},2)),${INNER_RIM_ALPHA_BYTE},0)'[inner_rim]`,
      `[disc_with_outer_rim][inner_rim]overlay=0:0:format=auto[disc_with_rims]`,
    );
    discBaseLabel = "[disc_with_rims]";

    lines.push(
      `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${discSize}x${discSize}:d=${duration}[label_raw]`,
      `[label_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${labelRadius},2)),${vinylTone.labelAlphaByte},0)'[label]`,
      `${discBaseLabel}[label]overlay=0:0:format=auto[disc_labeled]`,
      `color=c=${toFfmpegColor(vinylTone.holeHexColor, vinylTone.holeAlphaByte)}:s=${discSize}x${discSize}:d=${duration}[hole_raw]`,
      `[hole_raw]format=rgba,geq='r=${holeRgb.r}:g=${holeRgb.g}:b=${holeRgb.b}:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${holeRadius},2)),${vinylTone.holeAlphaByte},0)'[hole]`,
      `[disc_labeled][hole]overlay=0:0:format=auto[disc_with_hole]`,
      `[disc_with_hole]format=rgba,colorchannelmixer=aa=${normalizedRecordOpacity.toFixed(3)}[disc_opacity]`,
      `[disc_opacity]rotate=${spinRotateExpression}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
      `color=c=${toFfmpegColor(variant.ambientGlowHex, 255)}:s=${ambientGlowSize}x${ambientGlowSize}:d=${duration}[ambient_glow_raw]`,
      `[ambient_glow_raw]format=rgba,geq='r=${ambientGlowRgb.r}:g=${ambientGlowRgb.g}:b=${ambientGlowRgb.b}:a=if(lte(pow(X-${ambientGlowRadius},2)+pow(Y-${ambientGlowRadius},2),pow(${ambientGlowRadius},2)),${variant.ambientGlowAlphaByte},0)'[ambient_glow]`,
      `[bg][ambient_glow]overlay=${ambientGlowX}:${ambientGlowY}:format=auto[scene_ambient]`,
      `color=c=${toFfmpegColor(variant.glowHex, 255)}:s=${glowSize}x${glowSize}:d=${duration}[glow_raw]`,
      `[glow_raw]format=rgba,geq='r=${glowRgb.r}:g=${glowRgb.g}:b=${glowRgb.b}:a=if(lte(pow(X-${glowRadius},2)+pow(Y-${glowRadius},2),pow(${glowRadius},2)),${variant.glowAlphaByte},0)'[glow]`,
      `[scene_ambient][glow]overlay=${glowX}:${glowY}:format=auto[scene_0]`,
      `[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`,
    );
    lines.push(
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[scene_1]",
        width,
        height,
        mode,
        enabled: debugRenderModeBadge,
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
    const lines: string[] = [];
    if (hasBackgroundImage) {
      const blurFilter =
        backgroundBlurSigma > 0
          ? `,gblur=sigma=${backgroundBlurSigma.toFixed(2)}:steps=2`
          : "";
      lines.push(
        `[1:v]${buildPhotoScaleCropFilter(width, height)}${blurFilter}[safe_bg]`,
      );
    } else {
      lines.push(
        `color=c=${toFfmpegColor(stageBackgroundHex, 255)}:s=${width}x${height}:d=${duration}[safe_bg]`,
      );
    }
    lines.push(
      `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[safe_disc_raw]`,
      `[safe_disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[safe_disc]`,
      `color=c=${toFfmpegColor(variant.ambientGlowHex, 255)}:s=${ambientGlowSize}x${ambientGlowSize}:d=${duration}[safe_ambient_glow_raw]`,
      `[safe_ambient_glow_raw]format=rgba,geq='r=${ambientGlowRgb.r}:g=${ambientGlowRgb.g}:b=${ambientGlowRgb.b}:a=if(lte(pow(X-${ambientGlowRadius},2)+pow(Y-${ambientGlowRadius},2),pow(${ambientGlowRadius},2)),${variant.ambientGlowAlphaByte},0)'[safe_ambient_glow]`,
      `[safe_bg][safe_ambient_glow]overlay=${ambientGlowX}:${ambientGlowY}:format=auto[safe_scene_0]`,
      `[safe_disc]format=rgba,colorchannelmixer=aa=${normalizedRecordOpacity.toFixed(3)}[safe_disc_dim]`,
      `[safe_scene_0][safe_disc_dim]overlay=${discX}:${discY}:format=auto[safe_scene]`,
    );
    lines.push(
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[safe_scene]",
        width,
        height,
        mode: "safe_fallback",
        enabled: debugRenderModeBadge,
      }),
      `[${audioInputIndex}:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    );
    return lines.join(";");
  };

  const buildPrimaryCommand = (
    audioInputUri: string,
    backgroundInputUri: string | null,
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
      "-filter_complex",
      buildPrimaryFilterComplex(audioTrimStartSec, audioTrimEndSec, mode),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs(encoder, { fastMode }),
      "-c:a",
      "aac",
      "-b:a",
      AUDIO_BITRATE,
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
      "-filter_complex",
      buildSafeFallbackFilterComplex(audioTrimStartSec, audioTrimEndSec),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs("software", { fastMode }),
      "-c:a",
      "aac",
      "-b:a",
      AUDIO_BITRATE,
      "-r",
      String(fps),
      "-t",
      String(duration),
      "-shortest",
      outputPath,
    );
    return args;
  };

  let statisticsCallback: ((stats: Statistics) => void) | undefined;
  let sessionId: number | null = null;

  if (onProgress) {
    statisticsCallback = (stats: Statistics) => {
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
        0,
        Math.min(Math.round((frame / totalFrames) * 100), 99),
      );
      onProgress(percent);
    };
  }

  try {
    const { FFmpegKit, ReturnCode } = await getFFmpegKit();

    const runCommand = async (
      commandArguments: string[],
      options?: { withStatistics?: boolean },
    ) => {
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
      return { returnCode, logs };
    };

    let audioInputUri = preparedAudioUri;
    let audioTrimStartForRender = trimStartSec;
    let audioTrimEndForRender = trimEndSec;

    const normalizedPhotoPath = Paths.join(
      Paths.cache,
      `photo_norm_${variantId}_${discSize}_${Date.now()}.jpg`,
    );
    const normalizePhotoCommand = [
      "-y",
      "-i",
      preparedPhotoUri,
      "-vf",
      buildPhotoScaleCropFilter(discSize, discSize),
      "-frames:v",
      "1",
      "-q:v",
      fastMode ? "6" : "3",
      normalizedPhotoPath,
    ];
    const normalizePhotoResult = await runCommand(normalizePhotoCommand, {
      withStatistics: false,
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

    const primaryCommand = buildPrimaryCommand(
      audioInputUri,
      preparedBackgroundUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "primary",
      "hardware",
    );
    const fallbackCommand = buildPrimaryCommand(
      audioInputUri,
      preparedBackgroundUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "fallback",
      "software",
    );
    const safeFallbackCommand = buildSafeFallbackCommand(
      audioInputUri,
      preparedBackgroundUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
    );

    const primaryResult = await runCommand(primaryCommand);
    if (ReturnCode.isSuccess(primaryResult.returnCode)) {
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

    const fallbackResult = await runCommand(fallbackCommand);
    if (ReturnCode.isSuccess(fallbackResult.returnCode)) {
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

    const safeFallbackResult = await runCommand(safeFallbackCommand);
    if (ReturnCode.isSuccess(safeFallbackResult.returnCode)) {
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

    const details =
      summarizeFfmpegLogs(safeFallbackResult.logs) ||
      summarizeFfmpegLogs(fallbackResult.logs) ||
      summarizeFfmpegLogs(primaryResult.logs);
    const diagnostics = `photoScheme=${formatScheme(preparedPhotoUri)} audioScheme=${formatScheme(preparedAudioUri)} outputPath=${outputPath}`;
    if (details) {
      throw new Error(
        `FFmpeg rendering failed (code ${safeFallbackResult.returnCode}). ${details} | ${diagnostics}`,
      );
    }
    throw new Error(
      `FFmpeg rendering failed (code ${safeFallbackResult.returnCode}). ${diagnostics}`,
    );
  } finally {
    if (activeRenderToken === renderToken) {
      activeRenderSessionId = null;
      activeRenderToken = null;
    }
  }
}
