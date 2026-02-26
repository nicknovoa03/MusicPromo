import { Paths } from "expo-file-system";
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

const FPS = 30;
const SPIN_SPEED = "2*PI*t/4"; // full rotation every 4 seconds

function quoteFfmpegArg(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
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

  const cdSize = Math.round(Math.min(width, height) * 0.45);
  const cdRadius = Math.round(cdSize / 2);

  const outputPath = `${Paths.cache.uri}export_${Date.now()}.mp4`;

  // Filter graph:
  // [0:v] = photo looped as background, scaled + blurred
  // [0:v] copy = photo scaled to CD disc, masked as circle, rotated
  // [1:a] = audio trimmed to selection
  //
  // The circular mask uses the geq filter to create an alpha channel.
  // Rotation uses the rotate filter with transparent fill.
  const filterComplex = [
    // Background: scale photo to fill, apply heavy blur
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=40:20[bg]`,

    // Darken background overlay
    `[bg]colorkey=black:0.01:0.0[bg1]`,
    `color=black@0.6:s=${width}x${height}:d=${duration}[dark]`,
    `[bg1][dark]overlay=0:0:format=auto[bgdark]`,

    // CD disc: scale photo to disc size
    `[0:v]scale=${cdSize}:${cdSize}:force_original_aspect_ratio=increase,crop=${cdSize}:${cdSize}[disc_raw]`,

    // Apply circular mask using the format+geq approach
    `[disc_raw]format=rgba,geq=` +
      `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
      `a=if(lte(pow(X-${cdRadius},2)+pow(Y-${cdRadius},2),pow(${cdRadius},2)),255,0)'` +
      `[disc_circle]`,

    // Add center hole (black circle)
    `color=black@1.0:s=${cdSize}x${cdSize}[hole_bg]`,
    `[hole_bg]format=rgba,geq=` +
      `'r=0:g=0:b=0:` +
      `a=if(lte(pow(X-${cdRadius},2)+pow(Y-${cdRadius},2),pow(${Math.round(cdRadius * 0.12)},2)),255,0)'` +
      `[hole]`,
    `[disc_circle][hole]overlay=0:0:format=auto[disc_with_hole]`,

    // Rotate the disc — transparent fill so rotation doesn't clip
    `[disc_with_hole]rotate=${SPIN_SPEED}:ow=hypot(iw\\,ih):oh=ow:fillcolor=none[disc_rot]`,

    // Overlay rotated disc centered on darkened background
    `[bgdark][disc_rot]overlay=(W-w)/2:(H-h)/2:format=auto,` +
      `scale=${width}:${height},format=yuv420p[out]`,
  ].join(";");

  const command = [
    "-y",
    "-loop",
    "1",
    "-i",
    quoteFfmpegArg(photoUri),
    "-ss",
    String(trimStartSec),
    "-t",
    String(duration),
    "-i",
    quoteFfmpegArg(audioUri),
    "-filter_complex",
    `"${filterComplex}"`,
    "-map",
    `"[out]"`,
    "-map",
    "1:a",
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
      statisticsCallback,
    );
    sessionId = session.getSessionId();
    activeRenderSessionId = sessionId;

    if (activeRenderToken !== renderToken) {
      await FFmpegKit.cancel(sessionId);
      throw new Error("Rendering was canceled.");
    }

    const completedSession = await completedSessionPromise;
    const returnCode = await completedSession.getReturnCode();

    if (ReturnCode.isSuccess(returnCode)) {
      onProgress?.(100);
      return outputPath;
    }

    if (ReturnCode.isCancel(returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    const logs = await completedSession.getLogsAsString();
    if (__DEV__) {
      console.error("[renderSpinningCdVideo] FFmpeg failure:", logs);
    }
    throw new Error(`FFmpeg rendering failed (code ${returnCode}).`);
  } finally {
    if (activeRenderToken === renderToken) {
      activeRenderSessionId = null;
      activeRenderToken = null;
    }
  }
}
