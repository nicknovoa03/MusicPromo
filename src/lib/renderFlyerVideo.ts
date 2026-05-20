import * as LegacyFileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { isRunningInExpoGo } from "@/lib/runtimeEnvironment";
import { normalizeMediaUri } from "@/lib/mediaUri";
import type { FlyerAspectRatio } from "@/lib/flyerDraft";
import { flyerExportSize } from "@/lib/flyerDimensions";

export type RenderFlyerVideoOptions = {
  imageUri: string;
  audioUri: string;
  trimStart: number;
  trimEnd: number;
  aspectRatio: FlyerAspectRatio;
  outputFileName?: string;
  onProgress?: (percent: number) => void;
};

type FFmpegKitModule = typeof import("ffmpeg-kit-react-native");

let ffmpegModule: FFmpegKitModule | null = null;

async function getFFmpegKit(): Promise<FFmpegKitModule> {
  if (ffmpegModule) return ffmpegModule;
  ffmpegModule = await import("ffmpeg-kit-react-native");
  return ffmpegModule;
}

function extensionFromUri(uri: string): string {
  const withoutQuery = uri.split("?")[0] ?? uri;
  const ext = withoutQuery.split(".").pop()?.toLowerCase();
  if (ext === "png") return "png";
  if (ext === "jpg" || ext === "jpeg") return "jpg";
  if (ext === "m4a") return "m4a";
  if (ext === "wav") return "wav";
  if (ext === "mp3") return "mp3";
  return "dat";
}

async function ensureLocalUri(uri: string, prefix: string): Promise<string> {
  const normalized = normalizeMediaUri(uri);
  if (!normalized) throw new Error("Missing media URI");
  if (normalized.startsWith("file://")) return normalized;

  const cacheDir = LegacyFileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("Cache directory unavailable");

  const dest = `${cacheDir}${prefix}-${Date.now()}.${extensionFromUri(normalized)}`;
  await LegacyFileSystem.copyAsync({ from: normalized, to: dest });
  return dest;
}

export async function renderFlyerVideo(
  options: RenderFlyerVideoOptions,
): Promise<string> {
  if (Platform.OS === "web") {
    throw new Error(
      "Video export is not available on web. Use image export or test on a device.",
    );
  }

  if (isRunningInExpoGo()) {
    throw new Error(
      "Video export requires a development build. It cannot run in Expo Go.",
    );
  }

  const { width, height } = flyerExportSize(options.aspectRatio);
  const duration = Math.max(1, options.trimEnd - options.trimStart);
  const fps = 30;

  const imageInput = await ensureLocalUri(options.imageUri, "flyer-frame");
  const audioInput = await ensureLocalUri(options.audioUri, "flyer-audio");

  const cacheDir = LegacyFileSystem.cacheDirectory;
  if (!cacheDir) throw new Error("Cache directory unavailable");

  const safeName = (options.outputFileName ?? "Event Flyer")
    .replace(/[^\w.-]+/g, "_")
    .slice(0, 48);
  const outputPath = `${cacheDir}${safeName}-${Date.now()}.mp4`;

  const videoEncoder =
    Platform.OS === "ios"
      ? ["-c:v", "h264_videotoolbox", "-b:v", "6M", "-pix_fmt", "yuv420p"]
      : ["-c:v", "mpeg4", "-b:v", "6M"];

  const filter = [
    `[0:v]scale=${width}:${height}:force_original_aspect_ratio=decrease,`,
    `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,`,
    `format=yuv420p,fps=${fps}[vout]`,
    `[1:a]atrim=start=${options.trimStart}:end=${options.trimEnd},`,
    `asetpts=PTS-STARTPTS[aout]`,
  ].join("");

  const args = [
    "-y",
    "-loop",
    "1",
    "-framerate",
    String(fps),
    "-i",
    imageInput,
    "-i",
    audioInput,
    "-filter_complex",
    filter,
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    ...videoEncoder,
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    String(duration),
    "-shortest",
    outputPath,
  ];

  options.onProgress?.(10);

  const { FFmpegKit, ReturnCode } = await getFFmpegKit();
  const session = await FFmpegKit.executeWithArgumentsAsync(args);
  const returnCode = await session.getReturnCode();

  options.onProgress?.(100);

  if (ReturnCode.isSuccess(returnCode)) {
    return outputPath.startsWith("file://") ? outputPath : `file://${outputPath}`;
  }

  if (ReturnCode.isCancel(returnCode)) {
    throw new Error("Rendering was canceled.");
  }

  const logs = await session.getAllLogsAsString();
  throw new Error(
    `Flyer video export failed (code ${String(returnCode)}). ${logs?.slice(-400) ?? ""}`,
  );
}
