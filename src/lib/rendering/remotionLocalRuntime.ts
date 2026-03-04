import { normalizeMediaUri } from "@/lib/mediaUri";
import type { RenderRequest } from "@/lib/rendering/types";

const REMOTION_BRIDGE_KEY = "__MUSICPROMO_REMOTION_LOCAL_BRIDGE__";

function parseRemotionLocalSpikeEnabled(): boolean {
  const raw = process.env.EXPO_PUBLIC_REMOTION_LOCAL_SPIKE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "on";
}

export const REMOTION_LOCAL_SPIKE_ENABLED = parseRemotionLocalSpikeEnabled();

interface RemotionLocalRuntimeRenderInput {
  templateId: string;
  photoUri: string;
  audioUri: string;
  trimStart: number;
  trimEnd: number;
  aspectRatio: "9:16" | "1:1";
}

interface RemotionLocalRuntimeRenderResult {
  videoUri: string;
}

interface RemotionLocalRuntimeBridge {
  render(
    input: RemotionLocalRuntimeRenderInput,
    options?: { onProgress?: (percent: number) => void },
  ): Promise<RemotionLocalRuntimeRenderResult>;
  cancel?(): Promise<void>;
}

export function registerRemotionLocalRuntimeBridge(
  bridge: RemotionLocalRuntimeBridge,
): void {
  (globalThis as Record<string, unknown>)[REMOTION_BRIDGE_KEY] = bridge;
}

export function clearRemotionLocalRuntimeBridge(): void {
  delete (globalThis as Record<string, unknown>)[REMOTION_BRIDGE_KEY];
}

function getRemotionLocalRuntimeBridge(): RemotionLocalRuntimeBridge | null {
  const maybeBridge = (globalThis as Record<string, unknown>)[REMOTION_BRIDGE_KEY];
  if (!maybeBridge || typeof maybeBridge !== "object") return null;
  const bridge = maybeBridge as Partial<RemotionLocalRuntimeBridge>;
  if (typeof bridge.render !== "function") return null;
  return bridge as RemotionLocalRuntimeBridge;
}

export async function tryRenderWithRemotionLocalRuntime(
  templateId: string,
  request: RenderRequest,
): Promise<string | null> {
  if (!REMOTION_LOCAL_SPIKE_ENABLED) return null;
  const bridge = getRemotionLocalRuntimeBridge();
  if (!bridge) return null;

  const result = await bridge.render(
    {
      templateId,
      photoUri: request.photoUri,
      audioUri: request.audioUri,
      trimStart: request.trimStart,
      trimEnd: request.trimEnd,
      aspectRatio: request.aspectRatio,
    },
    {
      onProgress: request.onProgress,
    },
  );

  const normalizedVideoUri = normalizeMediaUri(result.videoUri);
  if (!normalizedVideoUri) {
    throw new Error("Remotion local runtime returned an empty output URI.");
  }

  return normalizedVideoUri;
}

export async function tryCancelRemotionLocalRuntime(): Promise<boolean> {
  const bridge = getRemotionLocalRuntimeBridge();
  if (!bridge?.cancel) return false;
  await bridge.cancel();
  return true;
}
