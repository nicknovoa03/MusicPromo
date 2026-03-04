import { Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { getSpinningCdTemplateLayout } from "@/lib/spinningCdTemplateSpec";
import {
  getSimpleSpinTemplateLayout,
  SIMPLE_SPIN_STAGE_BACKGROUND_HEX,
  SIMPLE_SPIN_GLOW_ALPHA_BYTE,
  SIMPLE_SPIN_GLOW_HEX,
} from "@/lib/simpleSpinTemplateSpec";
import { normalizeMediaUri } from "@/lib/mediaUri";
import {
  getVinylToneSpec,
  toFfmpegColor,
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
const VIDEO_OUTPUT_RANGE = "tv";
const SPIN_SPEED = "2*PI*t/4"; // full rotation every 4 seconds

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

export async function renderSpinningCdVideo(
  options: RenderOptions,
): Promise<string> {
  const {
    photoUri,
    audioUri,
    trimStart,
    trimEnd,
    aspectRatio,
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

  const renderToken = Symbol("render");
  activeRenderToken = renderToken;

  const layout = getSpinningCdTemplateLayout({ width, height, aspectRatio });
  const {
    recordSize,
    recordRadius,
    labelRadius,
    holeRadius,
    recordX,
    recordY,
    armWidth,
    armHeight,
    armX,
    armY,
    armCapWidth,
    armCapHeight,
    armCapX,
    armCapY,
    armHeadWidth,
    armHeadHeight,
    armHeadX,
    armHeadY,
    armShadowX,
    armShadowY,
    armShadowWidth,
    armShadowHeight,
    haloTopWidth,
    haloTopHeight,
    haloTopX,
    haloTopY,
    haloBottomWidth,
    haloBottomHeight,
    haloBottomX,
    haloBottomY,
    bottomShadeWidth,
    bottomShadeHeight,
    bottomShadeX,
    bottomShadeY,
    haloTopRadiusX,
    haloTopRadiusY,
    haloBottomRadiusX,
    haloBottomRadiusY,
    bottomShadeRadiusX,
    bottomShadeRadiusY,
    arcTopSize,
    arcTopRadius,
    arcTopX,
    arcTopY,
    arcMidSize,
    arcMidRadius,
    arcMidX,
    arcMidY,
    arcBottomSize,
    arcBottomRadius,
    arcBottomX,
    arcBottomY,
    tonearmPivotSize,
    tonearmPivotRadius,
    tonearmPivotX,
    tonearmPivotY,
    textBlockX,
    textNowY,
    textTitleY,
    textPillY,
    textNowWidth,
    textTitleWidth,
    textNowHeight,
    textTitleHeight,
    textPillWidth,
    textPillHeight,
    controlsY,
    leftControlX,
    middleControlX,
    rightControlX,
    controlWidth,
    controlHeight,
    iconInset,
    iconBarWidth,
    iconBarHeight,
    fallbackRecordSize,
    fallbackRecordRadius,
    fallbackRecordX,
    fallbackRecordY,
    fallbackLabelRadius,
    fallbackHoleRadius,
  } = layout;
  const vinylTone = getVinylToneSpec("spinning-cd");

  const [preparedPhotoUri, preparedAudioUri] = await Promise.all([
    ensureRenderableInputUri(photoUri, "photo"),
    ensureRenderableInputUri(audioUri, "audio"),
  ]);

  const outputPath = Paths.join(Paths.cache, `export_${Date.now()}.mp4`);
  let photoInputUriForRender = preparedPhotoUri;

  // Filter graph:
  // [0:v] = artwork source used for spinning vinyl texture
  // Scene = stylized turntable deck with tonearm + oversized spinning vinyl
  // [1:a] = audio trimmed to selection
  const buildFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      // Deck base inspired by the Create Flow stage: blurred artwork + tint + light halos.
      `[0:v]${buildPhotoScaleCropFilter(width, height)},boxblur=luma_radius=36:luma_power=3:chroma_radius=18:chroma_power=2,eq=saturation=0.62:contrast=1.02:brightness=0.015,format=rgba[bg_photo]`,
      `color=c=#c4c6cc@0.88:s=${width}x${height}:d=${duration}[bg_tint]`,
      `[bg_photo][bg_tint]overlay=0:0:format=auto[bg_tinted]`,
      `color=c=white@1.0:s=${haloTopWidth}x${haloTopHeight}:d=${duration}[halo_top_raw]`,
      `[halo_top_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow((X-${haloTopRadiusX})/${haloTopRadiusX},2)+pow((Y-${haloTopRadiusY})/${haloTopRadiusY},2),1),102,0)'[halo_top]`,
      `[halo_top]rotate=-12*PI/180:ow=rotw(iw):oh=roth(ih):fillcolor=black@0[halo_top_rot]`,
      `[bg_tinted][halo_top_rot]overlay=${haloTopX}:${haloTopY}:format=auto[bg_halo_0]`,
      `color=c=white@1.0:s=${haloBottomWidth}x${haloBottomHeight}:d=${duration}[halo_bottom_raw]`,
      `[halo_bottom_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow((X-${haloBottomRadiusX})/${haloBottomRadiusX},2)+pow((Y-${haloBottomRadiusY})/${haloBottomRadiusY},2),1),92,0)'[halo_bottom]`,
      `[halo_bottom]rotate=15*PI/180:ow=rotw(iw):oh=roth(ih):fillcolor=black@0[halo_bottom_rot]`,
      `[bg_halo_0][halo_bottom_rot]overlay=${haloBottomX}:${haloBottomY}:format=auto[bg_halo_1]`,
      `color=c=black@1.0:s=${bottomShadeWidth}x${bottomShadeHeight}:d=${duration}[shade_raw]`,
      `[shade_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow((X-${bottomShadeRadiusX})/${bottomShadeRadiusX},2)+pow((Y-${bottomShadeRadiusY})/${bottomShadeRadiusY},2),1),46,0)'[shade]`,
      `[bg_halo_1][shade]overlay=${bottomShadeX}:${bottomShadeY}:format=auto[bg_base]`,

      // Background template circles.
      `color=c=white@1.0:s=${arcTopSize}x${arcTopSize}:d=${duration}[arc_top_raw]`,
      `[arc_top_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow(X-${arcTopRadius},2)+pow(Y-${arcTopRadius},2),pow(${arcTopRadius},2)),84,0)'[arc_top]`,
      `[bg_base][arc_top]overlay=${arcTopX}:${arcTopY}:format=auto[bg_arc_0]`,
      `color=c=white@1.0:s=${arcMidSize}x${arcMidSize}:d=${duration}[arc_mid_raw]`,
      `[arc_mid_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow(X-${arcMidRadius},2)+pow(Y-${arcMidRadius},2),pow(${arcMidRadius},2)),58,0)'[arc_mid]`,
      `[bg_arc_0][arc_mid]overlay=${arcMidX}:${arcMidY}:format=auto[bg_arc_1]`,
      `color=c=black@1.0:s=${arcBottomSize}x${arcBottomSize}:d=${duration}[arc_bottom_raw]`,
      `[arc_bottom_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${arcBottomRadius},2)+pow(Y-${arcBottomRadius},2),pow(${arcBottomRadius},2)),52,0)'[arc_bottom]`,
      `[bg_arc_1][arc_bottom]overlay=${arcBottomX}:${arcBottomY}:format=auto[bg]`,

      // Static platter behind spinning artwork disc.
      `color=c=#16181d@0.96:s=${recordSize}x${recordSize}:d=${duration}[platter_raw]`,
      `[platter_raw]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${recordRadius},2)),235,0)'` +
        `[platter]`,

      // Spinning artwork disc.
      `[0:v]${buildPhotoScaleCropFilter(recordSize, recordSize)}[disc_raw]`,
      `[disc_raw]format=rgba[disc_tone]`,
      `[disc_tone]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${recordRadius},2)),255,0)'` +
        `[disc_circle]`,
      `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${recordSize}x${recordSize}:d=${duration}[disc_shade_raw]`,
      `[disc_shade_raw]format=rgba,geq=` +
        `'r=0:g=0:b=0:` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${recordRadius},2)),${vinylTone.shadeAlphaByte},0)'` +
        `[disc_shade]`,
      `[disc_circle][disc_shade]overlay=0:0:format=auto[disc_dark]`,

      // Center label + spindle hole.
      `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${recordSize}x${recordSize}:d=${duration}[label_bg]`,
      `[label_bg]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${labelRadius},2)),${vinylTone.labelAlphaByte},0)'` +
        `[label]`,
      `[disc_dark][label]overlay=0:0:format=auto[disc_labeled]`,
      `color=c=${toFfmpegColor(vinylTone.holeHexColor, vinylTone.holeAlphaByte)}:s=${recordSize}x${recordSize}:d=${duration}[hole_bg]`,
      `[hole_bg]format=rgba,geq=` +
        `'r=0:g=0:b=0:` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${holeRadius},2)),${vinylTone.holeAlphaByte},0)'` +
        `[hole]`,
      `[disc_labeled][hole]overlay=0:0:format=auto,format=rgba,rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,

      // Compose deck elements.
      `[bg][platter]overlay=${recordX}:${recordY}:format=auto[scene_0]`,
      `[scene_0][disc_rot]overlay=${recordX}:${recordY}:format=auto[scene_1]`,
      `color=c=#7a7b81@1.0:s=${tonearmPivotSize}x${tonearmPivotSize}:d=${duration}[pivot_raw]`,
      `[pivot_raw]format=rgba,geq='r=122:g=123:b=129:a=if(lte(pow(X-${tonearmPivotRadius},2)+pow(Y-${tonearmPivotRadius},2),pow(${tonearmPivotRadius},2)),66,0)'[pivot]`,
      `[scene_1][pivot]overlay=${tonearmPivotX}:${tonearmPivotY}:format=auto[scene_2]`,
      `[scene_2]drawbox=x=${armShadowX}:y=${armShadowY}:w=${armShadowWidth}:h=${armShadowHeight}:color=#7f8188@0.22:t=fill[scene_3]`,
      `[scene_3]drawbox=x=${armX}:y=${armY}:w=${armWidth}:h=${armHeight}:color=#dfe1e8@0.92:t=fill[scene_4]`,
      `[scene_4]drawbox=x=${armCapX}:y=${armCapY}:w=${armCapWidth}:h=${armCapHeight}:color=#1f2028@0.96:t=fill[scene_5]`,
      `[scene_5]drawbox=x=${armHeadX}:y=${armHeadY}:w=${armHeadWidth}:h=${armHeadHeight}:color=#191a20@0.98:t=fill[scene_6]`,
      `[scene_6]drawbox=x=${textBlockX}:y=${textNowY}:w=${textNowWidth}:h=${textNowHeight}:color=#ffffff@0.96:t=fill[scene_7]`,
      `[scene_7]drawbox=x=${textBlockX}:y=${textTitleY}:w=${textTitleWidth}:h=${textTitleHeight}:color=#ffffff@0.86:t=fill[scene_8]`,
      `[scene_8]drawbox=x=${textBlockX}:y=${textPillY}:w=${textPillWidth}:h=${textPillHeight}:color=#f2f2f2@0.96:t=fill[scene_9]`,
      `[scene_9]drawbox=x=${leftControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@1.0:t=fill[scene_10]`,
      `[scene_10]drawbox=x=${middleControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@0.96:t=fill[scene_11]`,
      `[scene_11]drawbox=x=${rightControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@0.96:t=fill[scene_12]`,
      `[scene_12]drawbox=x=${leftControlX + iconInset}:y=${controlsY + iconInset}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.94:t=fill[scene_13]`,
      `[scene_13]drawbox=x=${leftControlX + iconInset + iconBarWidth + 4}:y=${controlsY + iconInset}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.94:t=fill[scene_14]`,
      `[scene_14]drawbox=x=${middleControlX + iconInset + 8}:y=${controlsY + iconInset + 2}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.84:t=fill[scene_15]`,
      `[scene_15]drawbox=x=${rightControlX + iconInset + 8}:y=${controlsY + iconInset + 2}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.84:t=fill[scene_16]`,
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[scene_16]",
        width,
        height,
        mode: "primary",
        enabled: debugRenderModeBadge,
      }),

      // Audio: explicit trim/reset to avoid MP3 seek/timestamp quirks.
      `[1:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    ].join(";");

  const buildSpinningCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
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
      buildFilterComplex(audioTrimStartSec, audioTrimEndSec),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs("hardware", { fastMode }),
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
    ];

  // Compatibility fallback: simpler but still outputs a spinning artwork disc.
  const buildFallbackFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      `color=c=#c4c6cc:s=${width}x${height}:d=${duration}[fb_bg]`,
      `[fb_bg]format=rgba[fb_bg_0]`,
      `color=c=white@1.0:s=${arcTopSize}x${arcTopSize}:d=${duration}[fb_arc_top_raw]`,
      `[fb_arc_top_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow(X-${arcTopRadius},2)+pow(Y-${arcTopRadius},2),pow(${arcTopRadius},2)),84,0)'[fb_arc_top]`,
      `[fb_bg_0][fb_arc_top]overlay=${arcTopX}:${arcTopY}:format=auto[fb_bg_1]`,
      `color=c=white@1.0:s=${arcMidSize}x${arcMidSize}:d=${duration}[fb_arc_mid_raw]`,
      `[fb_arc_mid_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow(X-${arcMidRadius},2)+pow(Y-${arcMidRadius},2),pow(${arcMidRadius},2)),58,0)'[fb_arc_mid]`,
      `[fb_bg_1][fb_arc_mid]overlay=${arcMidX}:${arcMidY}:format=auto[fb_bg_2]`,
      `color=c=black@1.0:s=${arcBottomSize}x${arcBottomSize}:d=${duration}[fb_arc_bottom_raw]`,
      `[fb_arc_bottom_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${arcBottomRadius},2)+pow(Y-${arcBottomRadius},2),pow(${arcBottomRadius},2)),52,0)'[fb_arc_bottom]`,
      `[fb_bg_2][fb_arc_bottom]overlay=${arcBottomX}:${arcBottomY}:format=auto[fb_bg2]`,
      `[0:v]${buildPhotoScaleCropFilter(fallbackRecordSize, fallbackRecordSize)}[fb_disc_raw]`,
      `[fb_disc_raw]format=rgba[fb_disc_tone]`,
      `[fb_disc_tone]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${fallbackRecordRadius},2)+pow(Y-${fallbackRecordRadius},2),pow(${fallbackRecordRadius},2)),255,0)'` +
        `[fb_disc]`,
      `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${fallbackRecordSize}x${fallbackRecordSize}:d=${duration}[fb_shade_raw]`,
      `[fb_shade_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${fallbackRecordRadius},2)+pow(Y-${fallbackRecordRadius},2),pow(${fallbackRecordRadius},2)),${vinylTone.shadeAlphaByte},0)'[fb_shade]`,
      `[fb_disc][fb_shade]overlay=0:0:format=auto[fb_disc_dark]`,
      `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${fallbackRecordSize}x${fallbackRecordSize}:d=${duration}[fb_label_raw]`,
      `[fb_label_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${fallbackRecordRadius},2)+pow(Y-${fallbackRecordRadius},2),pow(${fallbackLabelRadius},2)),${vinylTone.labelAlphaByte},0)'[fb_label]`,
      `[fb_disc_dark][fb_label]overlay=0:0:format=auto[fb_disc_labeled]`,
      `color=c=${toFfmpegColor(vinylTone.holeHexColor, vinylTone.holeAlphaByte)}:s=${fallbackRecordSize}x${fallbackRecordSize}:d=${duration}[fb_hole_raw]`,
      `[fb_hole_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${fallbackRecordRadius},2)+pow(Y-${fallbackRecordRadius},2),pow(${fallbackHoleRadius},2)),${vinylTone.holeAlphaByte},0)'[fb_hole]`,
      `[fb_disc_labeled][fb_hole]overlay=0:0:format=auto,format=rgba,rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=black@0[fb_disc_rot]`,
      `[fb_bg2][fb_disc_rot]overlay=${fallbackRecordX}:${fallbackRecordY}:format=auto[fb_scene_0]`,
      `color=c=#7a7b81@1.0:s=${tonearmPivotSize}x${tonearmPivotSize}:d=${duration}[fb_pivot_raw]`,
      `[fb_pivot_raw]format=rgba,geq='r=122:g=123:b=129:a=if(lte(pow(X-${tonearmPivotRadius},2)+pow(Y-${tonearmPivotRadius},2),pow(${tonearmPivotRadius},2)),66,0)'[fb_pivot]`,
      `[fb_scene_0][fb_pivot]overlay=${tonearmPivotX}:${tonearmPivotY}:format=auto[fb_scene_1]`,
      `[fb_scene_1]drawbox=x=${armShadowX}:y=${armShadowY}:w=${armShadowWidth}:h=${armShadowHeight}:color=#7f8188@0.22:t=fill[fb_scene_2]`,
      `[fb_scene_2]drawbox=x=${armX}:y=${armY}:w=${armWidth}:h=${armHeight}:color=#dfe1e8@0.9:t=fill[fb_scene_3]`,
      `[fb_scene_3]drawbox=x=${armCapX}:y=${armCapY}:w=${armCapWidth}:h=${armCapHeight}:color=#1f2028@0.96:t=fill[fb_scene_4]`,
      `[fb_scene_4]drawbox=x=${armHeadX}:y=${armHeadY}:w=${armHeadWidth}:h=${armHeadHeight}:color=#191a20@0.98:t=fill[fb_scene_5]`,
      `[fb_scene_5]drawbox=x=${textBlockX}:y=${textNowY}:w=${textNowWidth}:h=${textNowHeight}:color=#ffffff@0.96:t=fill[fb_scene_6]`,
      `[fb_scene_6]drawbox=x=${textBlockX}:y=${textTitleY}:w=${textTitleWidth}:h=${textTitleHeight}:color=#ffffff@0.86:t=fill[fb_scene_7]`,
      `[fb_scene_7]drawbox=x=${textBlockX}:y=${textPillY}:w=${textPillWidth}:h=${textPillHeight}:color=#f2f2f2@0.96:t=fill[fb_scene_8]`,
      `[fb_scene_8]drawbox=x=${leftControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@1.0:t=fill[fb_scene_9]`,
      `[fb_scene_9]drawbox=x=${middleControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@0.96:t=fill[fb_scene_10]`,
      `[fb_scene_10]drawbox=x=${rightControlX}:y=${controlsY}:w=${controlWidth}:h=${controlHeight}:color=#1e1f24@0.96:t=fill[fb_scene_11]`,
      `[fb_scene_11]drawbox=x=${leftControlX + iconInset}:y=${controlsY + iconInset}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.94:t=fill[fb_scene_12]`,
      `[fb_scene_12]drawbox=x=${leftControlX + iconInset + iconBarWidth + 4}:y=${controlsY + iconInset}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.94:t=fill[fb_scene_13]`,
      `[fb_scene_13]drawbox=x=${middleControlX + iconInset + 8}:y=${controlsY + iconInset + 2}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.84:t=fill[fb_scene_14]`,
      `[fb_scene_14]drawbox=x=${rightControlX + iconInset + 8}:y=${controlsY + iconInset + 2}:w=${iconBarWidth}:h=${iconBarHeight}:color=#ffffff@0.84:t=fill[fb_scene_15]`,
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[fb_scene_15]",
        width,
        height,
        mode: "fallback",
        enabled: debugRenderModeBadge,
      }),
      `[1:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    ].join(";");

  const buildSafeFallbackCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      "-y",
      "-loop",
      "1",
      "-framerate",
      String(fps),
      "-i",
      photoInputUriForRender,
      "-i",
      audioInputUri,
      "-vf",
      buildSafeFallbackVideoFilter({
        width,
        height,
        mode: "safe_fallback",
        enabled: debugRenderModeBadge,
      }),
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-af",
      `atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS`,
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
    ];

  const buildFallbackCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
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
      buildFallbackFilterComplex(audioTrimStartSec, audioTrimEndSec),
      "-map",
      "[out]",
      "-map",
      "[audio_out]",
      ...buildVideoEncodeArgs("hardware", { fastMode }),
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
    ];

  let statisticsCallback: ((stats: Statistics) => void) | undefined;
  let sessionId: number | null = null;
  let progressFloor = 0;

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
      const adjustedPercent =
        progressFloor > 0
          ? Math.min(
              99,
              Math.round(progressFloor + (percent / 100) * (99 - progressFloor)),
            )
          : percent;
      onProgress(adjustedPercent);
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

    // Normalize every photo to a fixed render resolution before compositing.
    // This avoids repeatedly processing very large originals (e.g. >4K images)
    // inside the frame pipeline and improves export consistency/perf.
    const normalizedPhotoPath = Paths.join(
      Paths.cache,
      `photo_norm_${width}x${height}_${Date.now()}.jpg`,
    );
    const normalizePhotoCommand = [
      "-y",
      "-i",
      preparedPhotoUri,
      "-vf",
      buildPhotoScaleCropFilter(width, height),
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
        "[renderSpinningCdVideo] Photo normalization failed, using original photo input:",
        summarizeFfmpegLogs(normalizePhotoResult.logs),
      );
    }

    if (extensionFromUri(preparedAudioUri) === "mp3") {
      progressFloor = 12;
      onProgress?.(2);
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
          onProgress?.(progressFloor);
        }
      } else if (__DEV__) {
        console.warn(
          "[renderSpinningCdVideo] MP3 normalization failed, using original audio input:",
          summarizeFfmpegLogs(normalizeResult.logs),
        );
      }
    }

    const spinningCommand = buildSpinningCommand(
      audioInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
    );
    const fallbackCommand = buildFallbackCommand(
      audioInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
    );
    const safeFallbackCommand = buildSafeFallbackCommand(
      audioInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
    );

    if (fastMode) {
      const fastSafeFallbackResult = await runCommand(safeFallbackCommand);
      if (ReturnCode.isSuccess(fastSafeFallbackResult.returnCode)) {
        console.warn(
          "[renderSpinningCdVideo] Fast mode safe fallback command succeeded; visual output is simplified for speed.",
        );
        onProgress?.(100);
        return outputPath;
      }
      if (ReturnCode.isCancel(fastSafeFallbackResult.returnCode)) {
        throw new Error("Rendering was canceled.");
      }

      const fastDetails =
        summarizeFfmpegLogs(fastSafeFallbackResult.logs);
      const fastDiagnostics = `photoScheme=${formatScheme(preparedPhotoUri)} audioScheme=${formatScheme(preparedAudioUri)} outputPath=${outputPath}`;
      if (fastDetails) {
        throw new Error(
          `FFmpeg fast rendering failed (code ${fastSafeFallbackResult.returnCode}). ${fastDetails} | ${fastDiagnostics}`,
        );
      }
      throw new Error(
        `FFmpeg fast rendering failed (code ${fastSafeFallbackResult.returnCode}). ${fastDiagnostics}`,
      );
    }

    const primaryResult = await runCommand(spinningCommand);
    if (ReturnCode.isSuccess(primaryResult.returnCode)) {
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(primaryResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    // Primary graph can fail on some device FFmpeg builds; fallback still may succeed.
    console.warn(
      "[renderSpinningCdVideo] Primary FFmpeg command failed, trying fallback:",
      summarizeFfmpegLogs(primaryResult.logs) || "No diagnostic logs.",
    );

    const fallbackResult = await runCommand(fallbackCommand);
    if (ReturnCode.isSuccess(fallbackResult.returnCode)) {
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(fallbackResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    console.warn(
      "[renderSpinningCdVideo] Fallback FFmpeg command failed, trying safe fallback:",
      summarizeFfmpegLogs(fallbackResult.logs) || "No diagnostic logs.",
    );

    const safeFallbackResult = await runCommand(safeFallbackCommand);
    if (ReturnCode.isSuccess(safeFallbackResult.returnCode)) {
      console.warn(
        "[renderSpinningCdVideo] Safe fallback command succeeded; visual output may be simplified.",
      );
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(safeFallbackResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      console.error(
        "[renderSpinningCdVideo] Safe fallback FFmpeg command failed:",
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

export async function renderSimpleSpinVideo(
  options: RenderOptions,
): Promise<string> {
  const {
    photoUri,
    audioUri,
    trimStart,
    trimEnd,
    aspectRatio,
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

  const renderToken = Symbol("render-simple");
  activeRenderToken = renderToken;
  const layout = getSimpleSpinTemplateLayout({ width, height, aspectRatio });
  const {
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
  } = layout;
  const vinylTone = getVinylToneSpec("simple-spin");

  const [preparedPhotoUri, preparedAudioUri] = await Promise.all([
    ensureRenderableInputUri(photoUri, "photo"),
    ensureRenderableInputUri(audioUri, "audio"),
  ]);

  const outputPath = Paths.join(Paths.cache, `export_${Date.now()}.mp4`);
  let photoInputUriForRender = preparedPhotoUri;

  const buildPrimaryFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
    mode: RenderPath,
  ) =>
    [
      `color=c=${toFfmpegColor(SIMPLE_SPIN_STAGE_BACKGROUND_HEX, 255)}:s=${width}x${height}:d=${duration}[bg]`,
      `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[disc_raw]`,
      `[disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[disc_circle]`,
      `color=c=${toFfmpegColor(vinylTone.shadeHexColor, 255)}:s=${discSize}x${discSize}:d=${duration}[disc_shade_raw]`,
      `[disc_shade_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),${vinylTone.shadeAlphaByte},0)'[disc_shade]`,
      `[disc_circle][disc_shade]overlay=0:0:format=auto[disc_dark]`,
      `color=c=${toFfmpegColor(vinylTone.labelHexColor, vinylTone.labelAlphaByte)}:s=${discSize}x${discSize}:d=${duration}[label_raw]`,
      `[label_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${labelRadius},2)),${vinylTone.labelAlphaByte},0)'[label]`,
      `[disc_dark][label]overlay=0:0:format=auto[disc_labeled]`,
      `color=c=${toFfmpegColor(vinylTone.holeHexColor, vinylTone.holeAlphaByte)}:s=${discSize}x${discSize}:d=${duration}[hole_raw]`,
      `[hole_raw]format=rgba,geq='r=0:g=0:b=0:a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${holeRadius},2)),${vinylTone.holeAlphaByte},0)'[hole]`,
      `[disc_labeled][hole]overlay=0:0:format=auto,format=rgba,rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,
      `color=c=${toFfmpegColor(SIMPLE_SPIN_GLOW_HEX, 255)}:s=${glowSize}x${glowSize}:d=${duration}[glow_raw]`,
      `[glow_raw]format=rgba,geq='r=255:g=255:b=255:a=if(lte(pow(X-${glowRadius},2)+pow(Y-${glowRadius},2),pow(${glowRadius},2)),${SIMPLE_SPIN_GLOW_ALPHA_BYTE},0)'[glow]`,
      `[bg][glow]overlay=${glowX}:${glowY}:format=auto[scene_0]`,
      `[scene_0][disc_rot]overlay=${discX}:${discY}:format=auto[scene_1]`,
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[scene_1]",
        width,
        height,
        mode,
        enabled: debugRenderModeBadge,
      }),
      `[1:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    ].join(";");

  const buildSafeFallbackFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      `color=c=${toFfmpegColor(SIMPLE_SPIN_STAGE_BACKGROUND_HEX, 255)}:s=${width}x${height}:d=${duration}[safe_bg]`,
      `[0:v]${buildPhotoScaleCropFilter(discSize, discSize)}[safe_disc_raw]`,
      `[safe_disc_raw]format=rgba,geq='r=r(X,Y):g=g(X,Y):b=b(X,Y):a=if(lte(pow(X-${discRadius},2)+pow(Y-${discRadius},2),pow(${discRadius},2)),255,0)'[safe_disc]`,
      `[safe_bg][safe_disc]overlay=${discX}:${discY}:format=auto[safe_scene]`,
      ...buildRenderModeBadgeFilterGraph({
        inputLabel: "[safe_scene]",
        width,
        height,
        mode: "safe_fallback",
        enabled: debugRenderModeBadge,
      }),
      `[1:a]atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS[audio_out]`,
    ].join(";");

  const buildPrimaryCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
    mode: RenderPath,
    encoder: "hardware" | "software",
  ) =>
    [
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
    ];

  const buildSafeFallbackCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
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
    ];

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
      `photo_norm_simple_${discSize}_${Date.now()}.jpg`,
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
        "[renderSimpleSpinVideo] Photo normalization failed, using original photo input:",
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
          "[renderSimpleSpinVideo] MP3 normalization failed, using original audio input:",
          summarizeFfmpegLogs(normalizeResult.logs),
        );
      }
    }

    const primaryCommand = buildPrimaryCommand(
      audioInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "primary",
      "hardware",
    );
    const fallbackCommand = buildPrimaryCommand(
      audioInputUri,
      audioTrimStartForRender,
      audioTrimEndForRender,
      "fallback",
      "software",
    );
    const safeFallbackCommand = buildSafeFallbackCommand(
      audioInputUri,
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
        "[renderSimpleSpinVideo] Primary command failed, trying software fallback:",
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
        "[renderSimpleSpinVideo] Software fallback failed, trying safe fallback:",
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
        "[renderSimpleSpinVideo] Safe fallback command failed:",
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
