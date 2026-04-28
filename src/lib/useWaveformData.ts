import { useState, useEffect } from "react";
import { InteractionManager } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

// Low sample rate is plenty for waveform visualization
const SCAN_SAMPLE_RATE = 4000;

// Module-level cache so the FFmpeg scan only runs once per URI+barCount
const waveformCache = new Map<string, number[]>();

function readF32LE(buf: Uint8Array, byteOffset: number): number {
  const u32 =
    buf[byteOffset] |
    (buf[byteOffset + 1] << 8) |
    (buf[byteOffset + 2] << 16) |
    (buf[byteOffset + 3] << 24);
  // IEEE 754 float32 from bit pattern
  const sign = u32 >>> 31 ? -1 : 1;
  const exp = ((u32 >>> 23) & 0xff) - 127;
  const mantissa = exp === -127 ? (u32 & 0x7fffff) / 0x800000 : 1 + (u32 & 0x7fffff) / 0x800000;
  return exp === -127 && (u32 & 0x7fffff) === 0
    ? 0
    : sign * mantissa * Math.pow(2, exp);
}

function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function extractWaveform(audioUri: string, barCount: number): Promise<number[] | null> {
  const cacheKey = `${audioUri}:${barCount}`;
  const cached = waveformCache.get(cacheKey);
  if (cached) return cached;

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) return null;

  const outPath = `${cacheDir}waveform-scan-${Date.now()}-${Math.random().toString(36).slice(2)}.raw`;

  try {
    const { FFmpegKit, ReturnCode } = await import("ffmpeg-kit-react-native");

    // executeWithArgumentsAsync resolves when the session is *created*, not when FFmpeg finishes.
    // Must use the completion callback + promise pattern (same as renderVideo.ts).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resolveCompleted: ((s: any) => void) | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const completedPromise = new Promise<any>((resolve) => { resolveCompleted = resolve; });

    await FFmpegKit.executeWithArgumentsAsync(
      ["-y", "-i", audioUri, "-map", "0:a:0", "-ac", "1", "-ar", String(SCAN_SAMPLE_RATE), "-f", "f32le", outPath],
      (completedSession: unknown) => resolveCompleted?.(completedSession),
    );

    const completedSession = await completedPromise;
    const returnCode = await completedSession.getReturnCode();
    if (!ReturnCode.isSuccess(returnCode)) {
      const logsStr: string = await completedSession.getLogsAsString();
      console.warn("[waveform] FFmpeg failed:", logsStr.slice(-800));
      return null;
    }

    const info = await FileSystem.getInfoAsync(outPath);
    if (!info.exists || !("size" in info) || !info.size || info.size < 4) return null;

    const rawB64 = await FileSystem.readAsStringAsync(outPath, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const raw = b64ToBytes(rawB64);

    // Defer heavy JS processing until animations are idle to avoid blocking the UI thread
    await new Promise<void>((resolve) => InteractionManager.runAfterInteractions(() => resolve()));

    // Each sample = 4 bytes (f32le)
    const totalSamples = Math.floor(raw.length / 4);
    const framesPerBar = Math.max(1, Math.floor(totalSamples / barCount));

    const amplitudes: number[] = [];
    let peak = 0;

    for (let bar = 0; bar < barCount; bar++) {
      const start = Math.floor((bar / barCount) * totalSamples);
      const end = Math.min(start + framesPerBar, totalSamples);
      let sum = 0;
      for (let i = start; i < end; i++) {
        const v = readF32LE(raw, i * 4);
        sum += v * v;
      }
      const rms = Math.sqrt(sum / Math.max(end - start, 1));
      amplitudes.push(rms);
      if (rms > peak) peak = rms;
    }

    if (peak === 0) return null;
    const normalized = amplitudes.map((v) => v / peak);

    // Log compression so bass-heavy songs don't dwarf everything else (SoundCloud-style)
    const K = 4;
    const logScale = Math.log(1 + K);
    const compressed = normalized.map((v) => Math.log(1 + K * v) / logScale);

    // 5-bar weighted smooth to reduce harsh spikes between adjacent bars
    const smoothed = compressed.map((v, i, arr) => {
      const w = [0.1, 0.2, 0.4, 0.2, 0.1];
      let sum = 0;
      let wSum = 0;
      for (let d = -2; d <= 2; d++) {
        const j = i + d;
        if (j >= 0 && j < arr.length) {
          sum += arr[j] * w[d + 2];
          wSum += w[d + 2];
        }
      }
      return sum / wSum;
    });

    console.log(`[waveform] scan complete — ${totalSamples} samples, peak=${peak.toFixed(4)}`);
    waveformCache.set(cacheKey, smoothed);
    return smoothed;
  } catch (e) {
    console.warn("[waveform] error:", e);
    return null;
  } finally {
    FileSystem.deleteAsync(outPath, { idempotent: true }).catch(() => {});
  }
}

export function useWaveformData(uri: string | undefined, barCount: number): number[] | null {
  const [data, setData] = useState<number[] | null>(() => {
    if (!uri) return null;
    return waveformCache.get(`${uri}:${barCount}`) ?? null;
  });

  useEffect(() => {
    if (!uri) {
      setData(null);
      return;
    }
    const cacheKey = `${uri}:${barCount}`;
    const cached = waveformCache.get(cacheKey);
    if (cached) {
      setData(cached);
      return;
    }
    setData(null);
    let cancelled = false;
    console.log("[waveform] starting scan for:", uri.slice(0, 80));
    extractWaveform(uri, barCount).then((result) => {
      if (!cancelled) {
        console.log("[waveform] setData →", result ? `${result.length} bars` : "null (fallback)");
        setData(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [uri, barCount]);

  return data;
}
