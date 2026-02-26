/**
 * FFmpeg spike — minimal test: static image + audio -> 5-second MP4.
 * Run this from a dev button or console to verify ffmpeg-kit works
 * with Expo SDK 54 / RN 0.81 / New Architecture.
 *
 * Delete this file after the spike succeeds.
 */
import { Paths, File } from "expo-file-system";
import { FFmpegKit, ReturnCode } from "ffmpeg-kit-react-native";

export async function runFfmpegSpike(
  imageUri: string,
  audioUri: string,
): Promise<string> {
  const outputPath = `${Paths.cache.uri}spike_output.mp4`;

  const cmd = [
    "-y",
    "-loop",
    "1",
    "-i",
    imageUri,
    "-i",
    audioUri,
    "-c:v",
    "mpeg4",
    "-b:v",
    "2M",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-t",
    "5",
    "-pix_fmt",
    "yuv420p",
    "-shortest",
    outputPath,
  ].join(" ");

  console.log("[FFmpeg Spike] Running command:", cmd);

  const session = await FFmpegKit.execute(cmd);
  const returnCode = await session.getReturnCode();

  if (ReturnCode.isSuccess(returnCode)) {
    console.log("[FFmpeg Spike] Success! Output at:", outputPath);
    const outputFile = new File(outputPath);
    console.log("[FFmpeg Spike] File exists:", outputFile.exists);
    return outputPath;
  }

  const logs = await session.getLogsAsString();
  console.error("[FFmpeg Spike] Failed. Logs:", logs);
  throw new Error(`FFmpeg spike failed with return code ${returnCode}`);
}
