import { Paths } from "expo-file-system";
import * as LegacyFileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";

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
}

type FFmpegKitModule = typeof import("ffmpeg-kit-react-native");
type FFmpegSession = import("ffmpeg-kit-react-native").FFmpegSession;
type Statistics = import("ffmpeg-kit-react-native").Statistics;
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

const FPS = 60;
const SPIN_SPEED = "2*PI*t/4"; // full rotation every 4 seconds

function quoteFfmpegArg(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
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
  if (!uri.trim()) {
    throw new Error(`Missing ${kind} file.`);
  }

  if (uri.startsWith("file://")) {
    try {
      const info = await LegacyFileSystem.getInfoAsync(uri);
      if (info.exists) {
        return uri;
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

  const sourceExt = extensionFromUri(uri);
  const fallbackExt = kind === "photo" ? "jpg" : "m4a";
  const ext = sourceExt || fallbackExt;
  const copiedUri = `${LegacyFileSystem.cacheDirectory}render-${kind}-${Date.now()}-${Math.floor(
    Math.random() * 1_000_000,
  )}.${ext}`;

  try {
    await LegacyFileSystem.copyAsync({ from: uri, to: copiedUri });
  } catch {
    throw new Error(
      `Unable to read selected ${kind} for rendering (scheme: ${formatScheme(uri)}). Re-select the ${kind} and try again.`,
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
  const { photoUri, audioUri, trimStart, trimEnd, aspectRatio, onProgress } =
    options;

  if (!Number.isFinite(trimStart) || !Number.isFinite(trimEnd)) {
    throw new Error("Invalid trim range.");
  }

  const trimStartSec = Math.max(0, trimStart);
  const trimEndSec = trimEnd;
  if (trimEndSec <= trimStartSec) {
    throw new Error("Invalid trim range.");
  }

  const { width, height } = OUTPUT_DIMENSIONS[aspectRatio];
  const duration = Math.max(trimEndSec - trimStartSec, 1 / FPS);
  const totalFrames = Math.max(Math.round(duration * FPS), 1);

  if (activeRenderToken !== null) {
    throw new Error("A video render is already in progress.");
  }

  const renderToken = Symbol("render");
  activeRenderToken = renderToken;

  const isPortraitLayout = aspectRatio === "9:16";
  const recordSize = isPortraitLayout
    ? Math.round(width * 1.42)
    : Math.round(Math.min(width, height) * 1.18);
  const recordRadius = Math.round(recordSize / 2);
  const labelRadius = Math.round(recordRadius * 0.2);
  const holeRadius = Math.max(Math.round(recordRadius * 0.035), 6);
  const recordX = isPortraitLayout
    ? -Math.round(recordSize * 0.5)
    : Math.round((width - recordSize) / 2);
  const recordY = isPortraitLayout
    ? Math.round(height * 0.08)
    : Math.round((height - recordSize) / 2 - height * 0.07);

  const armWidth = Math.max(Math.round(width * 0.024), 12);
  const armHeight = isPortraitLayout
    ? Math.round(height * 0.31)
    : Math.round(recordSize * 0.46);
  const armX = isPortraitLayout
    ? Math.round(width * 0.86)
    : Math.round(width * 0.77);
  const armY = isPortraitLayout
    ? Math.round(height * 0.12)
    : Math.round(height * 0.24);
  const armCapWidth = Math.round(armWidth * 2.8);
  const armCapHeight = Math.max(Math.round(width * 0.025), 18);
  const armCapX = armX - Math.round((armCapWidth - armWidth) / 2);
  const armCapY = armY + armHeight - Math.round(armCapHeight * 0.6);
  const armHeadWidth = Math.round(armWidth * 3.6);
  const armHeadHeight = Math.max(Math.round(width * 0.055), 36);
  const armHeadX = armX - Math.round((armHeadWidth - armWidth) / 2);
  const armHeadY = armCapY + armCapHeight + Math.max(Math.round(width * 0.012), 8);
  const armShadowX = armX - Math.round(width * 0.01);
  const armShadowY = armY - Math.round(width * 0.03);
  const armShadowWidth = armHeadWidth + Math.round(width * 0.04);
  const armShadowHeight =
    armHeadY + armHeadHeight - armShadowY + Math.round(width * 0.015);

  const haloTopWidth = Math.round(width * 0.6);
  const haloTopHeight = Math.round(height * 0.24);
  const haloTopX = Math.round(width * 0.56);
  const haloTopY = -Math.round(height * 0.12);
  const haloBottomWidth = Math.round(width * 0.72);
  const haloBottomHeight = Math.round(height * 0.26);
  const haloBottomX = -Math.round(width * 0.1);
  const haloBottomY = Math.round(height * 0.82);
  const bottomShadeWidth = width + Math.round(width * 0.3);
  const bottomShadeHeight = Math.round(height * 0.32);
  const bottomShadeX = -Math.round((bottomShadeWidth - width) / 2);
  const bottomShadeY = height - Math.round(bottomShadeHeight * 0.58);
  const haloTopRadiusX = Math.max(Math.round(haloTopWidth / 2), 1);
  const haloTopRadiusY = Math.max(Math.round(haloTopHeight / 2), 1);
  const haloBottomRadiusX = Math.max(Math.round(haloBottomWidth / 2), 1);
  const haloBottomRadiusY = Math.max(Math.round(haloBottomHeight / 2), 1);
  const bottomShadeRadiusX = Math.max(Math.round(bottomShadeWidth / 2), 1);
  const bottomShadeRadiusY = Math.max(Math.round(bottomShadeHeight / 2), 1);

  const [preparedPhotoUri, preparedAudioUri] = await Promise.all([
    ensureRenderableInputUri(photoUri, "photo"),
    ensureRenderableInputUri(audioUri, "audio"),
  ]);

  const outputPath = Paths.join(Paths.cache, `export_${Date.now()}.mp4`);

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
      `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=36:3,eq=saturation=0.62:contrast=1.02:brightness=0.015,format=rgba[bg_photo]`,
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
      `[bg_halo_1][shade]overlay=${bottomShadeX}:${bottomShadeY}:format=auto[bg]`,

      // Static platter behind spinning artwork disc.
      `color=c=#16181d@0.96:s=${recordSize}x${recordSize}:d=${duration}[platter_raw]`,
      `[platter_raw]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${recordRadius},2)),235,0)'` +
        `[platter]`,

      // Spinning artwork disc.
      `[0:v]scale=${recordSize}:${recordSize}:force_original_aspect_ratio=increase,crop=${recordSize}:${recordSize}[disc_raw]`,
      `[disc_raw]format=rgba[disc_tone]`,
      `[disc_tone]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${recordRadius},2)),255,0)'` +
        `[disc_circle]`,

      // Center label + spindle hole.
      `color=c=#e8e2d5@0.95:s=${recordSize}x${recordSize}:d=${duration}[label_bg]`,
      `[label_bg]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${labelRadius},2)),235,0)'` +
        `[label]`,
      `[disc_circle][label]overlay=0:0:format=auto[disc_labeled]`,
      `color=black@1.0:s=${recordSize}x${recordSize}:d=${duration}[hole_bg]`,
      `[hole_bg]format=rgba,geq=` +
        `'r=0:g=0:b=0:` +
        `a=if(lte(pow(X-${recordRadius},2)+pow(Y-${recordRadius},2),pow(${holeRadius},2)),255,0)'` +
        `[hole]`,
      `[disc_labeled][hole]overlay=0:0:format=auto,format=rgba,rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=black@0[disc_rot]`,

      // Compose deck elements.
      `[bg][platter]overlay=${recordX}:${recordY}:format=auto[scene_0]`,
      `[scene_0][disc_rot]overlay=${recordX}:${recordY}:format=auto[scene_1]`,
      `[scene_1]drawbox=x=${armShadowX}:y=${armShadowY}:w=${armShadowWidth}:h=${armShadowHeight}:color=#7f8188@0.25:t=fill[scene_2]`,
      `[scene_2]drawbox=x=${armX}:y=${armY}:w=${armWidth}:h=${armHeight}:color=#dfe1e8@0.92:t=fill[scene_3]`,
      `[scene_3]drawbox=x=${armCapX}:y=${armCapY}:w=${armCapWidth}:h=${armCapHeight}:color=#1f2028@0.96:t=fill[scene_4]`,
      `[scene_4]drawbox=x=${armHeadX}:y=${armHeadY}:w=${armHeadWidth}:h=${armHeadHeight}:color=#191a20@0.98:t=fill,format=yuv420p[out]`,

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
      "-i",
      quoteFfmpegArg(preparedPhotoUri),
      "-i",
      quoteFfmpegArg(audioInputUri),
      "-filter_complex",
      `"${buildFilterComplex(audioTrimStartSec, audioTrimEndSec)}"`,
      "-map",
      `"[out]"`,
      "-map",
      `"[audio_out]"`,
      "-c:v",
      "mpeg4",
      "-b:v",
      "4M",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-r",
      String(FPS),
      "-t",
      String(duration),
      "-shortest",
      quoteFfmpegArg(outputPath),
    ].join(" ");

  // Compatibility fallback: simpler but still outputs a spinning artwork disc.
  const fallbackRecordSize = Math.round(Math.min(width, height) * 0.72);
  const fallbackRecordRadius = Math.round(fallbackRecordSize / 2);
  const fallbackRecordX = Math.round((width - fallbackRecordSize) / 2);
  const fallbackRecordY =
    Math.round((height - fallbackRecordSize) / 2) -
    (isPortraitLayout ? Math.round(height * 0.05) : 0);
  const buildFallbackFilterComplex = (
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      `color=c=#b9bbc3:s=${width}x${height}:d=${duration}[fb_bg]`,
      `[fb_bg]format=rgba[fb_bg2]`,
      `[0:v]scale=${fallbackRecordSize}:${fallbackRecordSize}:force_original_aspect_ratio=increase,crop=${fallbackRecordSize}:${fallbackRecordSize}[fb_disc_raw]`,
      `[fb_disc_raw]format=rgba,geq=` +
        `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
        `a=if(lte(pow(X-${fallbackRecordRadius},2)+pow(Y-${fallbackRecordRadius},2),pow(${fallbackRecordRadius},2)),255,0)'` +
        `[fb_disc]`,
      `[fb_disc]rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=black@0[fb_disc_rot]`,
      `[fb_bg2][fb_disc_rot]overlay=${fallbackRecordX}:${fallbackRecordY}:format=auto,format=yuv420p[out]`,
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
      "-i",
      quoteFfmpegArg(preparedPhotoUri),
      "-i",
      quoteFfmpegArg(audioInputUri),
      "-vf",
      `"scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p"`,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-af",
      `"atrim=start=${audioTrimStartSec}:end=${audioTrimEndSec},asetpts=PTS-STARTPTS"`,
      "-c:v",
      "mpeg4",
      "-b:v",
      "4M",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-r",
      String(FPS),
      "-t",
      String(duration),
      "-shortest",
      quoteFfmpegArg(outputPath),
    ].join(" ");

  const buildFallbackCommand = (
    audioInputUri: string,
    audioTrimStartSec: number,
    audioTrimEndSec: number,
  ) =>
    [
      "-y",
      "-loop",
      "1",
      "-i",
      quoteFfmpegArg(preparedPhotoUri),
      "-i",
      quoteFfmpegArg(audioInputUri),
      "-filter_complex",
      `"${buildFallbackFilterComplex(audioTrimStartSec, audioTrimEndSec)}"`,
      "-map",
      `"[out]"`,
      "-map",
      `"[audio_out]"`,
      "-c:v",
      "mpeg4",
      "-b:v",
      "4M",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-r",
      String(FPS),
      "-t",
      String(duration),
      "-shortest",
      quoteFfmpegArg(outputPath),
    ].join(" ");

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
      command: string,
      options?: { withStatistics?: boolean },
    ) => {
      let resolveCompletedSession: ((session: FFmpegSession) => void) | undefined;
      const completedSessionPromise = new Promise<FFmpegSession>((resolve) => {
        resolveCompletedSession = resolve;
      });

      const session = await FFmpegKit.executeAsync(
        command,
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
        quoteFfmpegArg(preparedAudioUri),
        "-map",
        "0:a:0",
        "-vn",
        "-sn",
        "-dn",
        "-c:a",
        "aac",
        "-b:a",
        "192k",
        "-ar",
        "48000",
        "-ac",
        "2",
        quoteFfmpegArg(normalizedAudioPath),
      ].join(" ");

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

    const primaryResult = await runCommand(spinningCommand);
    if (ReturnCode.isSuccess(primaryResult.returnCode)) {
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(primaryResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      // Primary graph can fail on some device FFmpeg builds; fallback still may succeed.
      console.warn(
        "[renderSpinningCdVideo] Primary FFmpeg command failed, trying fallback:",
        summarizeFfmpegLogs(primaryResult.logs),
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
      console.error(
        "[renderSpinningCdVideo] Fallback FFmpeg command failed:",
        fallbackResult.logs,
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
