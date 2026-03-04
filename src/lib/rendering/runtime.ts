import type { RenderEngine } from "@/lib/rendering/types";
import { REMOTION_LOCAL_SPIKE_ENABLED } from "@/lib/rendering/remotionLocalRuntime";
import { isSpinningCdTemplate } from "@/lib/rendering/templates/spinningCdComposition";

const DEFAULT_RENDER_ENGINE: RenderEngine = "ffmpeg";
const REMOTION_LOCAL_FLAG = "remotion-local";

function parseFeatureFlagEngine(): RenderEngine {
  const raw = process.env.EXPO_PUBLIC_RENDER_ENGINE?.trim().toLowerCase();
  if (raw === REMOTION_LOCAL_FLAG) {
    return "remotion-local";
  }
  return DEFAULT_RENDER_ENGINE;
}

export const FEATURE_FLAG_RENDER_ENGINE: RenderEngine = parseFeatureFlagEngine();

export function resolvePreferredRenderEngine(templateId?: string): RenderEngine {
  if (
    FEATURE_FLAG_RENDER_ENGINE === "remotion-local" &&
    REMOTION_LOCAL_SPIKE_ENABLED &&
    isSpinningCdTemplate(templateId)
  ) {
    return "remotion-local";
  }
  return DEFAULT_RENDER_ENGINE;
}
