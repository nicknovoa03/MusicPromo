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

  const cdSize = Math.round(Math.min(width, height) * 0.45);
  const cdRadius = Math.round(cdSize / 2);
  const labelRadius = Math.round(cdRadius * 0.26);
  const holeRadius = Math.max(Math.round(cdRadius * 0.05), 6);

  const outputPath = `${Paths.cache.uri}export_${Date.now()}.mp4`;

  // Filter graph:
  // [0:v] = photo looped as background, scaled + blurred
  // [0:v] copy = photo scaled to vinyl disc, tinted darker, masked as circle, rotated
  // [1:a] = audio trimmed to selection
  const filterComplex = [
    // Background: blurred + darkened cover art.
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},boxblur=40:20,eq=brightness=-0.22:saturation=1.05[bg]`,

    // Disc: crop to square and tint down so it reads as a vinyl texture.
    `[0:v]scale=${cdSize}:${cdSize}:force_original_aspect_ratio=increase,crop=${cdSize}:${cdSize}[disc_raw]`,
    `[disc_raw]hue=s=0.45,eq=contrast=1.15:brightness=-0.05[disc_tone]`,

    // Circle mask.
    `[disc_tone]format=rgba,geq=` +
      `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
      `a=if(lte(pow(X-${cdRadius},2)+pow(Y-${cdRadius},2),pow(${cdRadius},2)),255,0)'` +
      `[disc_circle]`,

    // Vinyl center label and spindle hole.
    `color=c=#efe8da@0.92:s=${cdSize}x${cdSize}:d=${duration}[label_bg]`,
    `[label_bg]format=rgba,geq=` +
      `'r=r(X,Y):g=g(X,Y):b=b(X,Y):` +
      `a=if(lte(pow(X-${cdRadius},2)+pow(Y-${cdRadius},2),pow(${labelRadius},2)),230,0)'` +
      `[label]`,
    `[disc_circle][label]overlay=0:0:format=auto[disc_labeled]`,
    `color=black@1.0:s=${cdSize}x${cdSize}:d=${duration}[hole_bg]`,
    `[hole_bg]format=rgba,geq=` +
      `'r=0:g=0:b=0:` +
      `a=if(lte(pow(X-${cdRadius},2)+pow(Y-${cdRadius},2),pow(${holeRadius},2)),255,0)'` +
      `[hole]`,
    `[disc_labeled][hole]overlay=0:0:format=auto[disc_with_hole]`,

    // Rotate within same square; the masked disc still reads circular.
    `[disc_with_hole]rotate=${SPIN_SPEED}:ow=iw:oh=ih:fillcolor=none[disc_rot]`,

    // Composite disc into the center of the frame.
    `[bg][disc_rot]overlay=(W-w)/2:(H-h)/2:format=auto,format=yuv420p[out]`,
  ].join(";");

  const spinningCommand = [
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

  // Compatibility fallback: skips advanced rotate/mask filters in case
  // some FFmpeg builds reject the complex graph on certain devices.
  const fallbackCommand = [
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
    "-vf",
    `"scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p"`,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
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

    const runCommand = async (command: string) => {
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
      const logs = await completedSession.getLogsAsString();
      return { returnCode, logs };
    };

    const primaryResult = await runCommand(spinningCommand);
    if (ReturnCode.isSuccess(primaryResult.returnCode)) {
      onProgress?.(100);
      return outputPath;
    }
    if (ReturnCode.isCancel(primaryResult.returnCode)) {
      throw new Error("Rendering was canceled.");
    }

    if (__DEV__) {
      console.error(
        "[renderSpinningCdVideo] Primary FFmpeg command failed:",
        primaryResult.logs,
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

    const details =
      summarizeFfmpegLogs(fallbackResult.logs) ||
      summarizeFfmpegLogs(primaryResult.logs);
    if (details) {
      throw new Error(
        `FFmpeg rendering failed (code ${fallbackResult.returnCode}). ${details}`,
      );
    }
    throw new Error(`FFmpeg rendering failed (code ${fallbackResult.returnCode}).`);
  } finally {
    if (activeRenderToken === renderToken) {
      activeRenderSessionId = null;
      activeRenderToken = null;
    }
  }
}
