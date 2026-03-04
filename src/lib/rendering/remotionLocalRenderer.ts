import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";
import { ffmpegRenderer } from "@/lib/rendering/ffmpegRenderer";
import {
  REMOTION_LOCAL_SPIKE_ENABLED,
  tryCancelRemotionLocalRuntime,
  tryRenderWithRemotionLocalRuntime,
} from "@/lib/rendering/remotionLocalRuntime";
import { resolveTemplateId } from "@/lib/templates";

export const remotionLocalRenderer: Renderer = {
  engine: "remotion-local",
  async render(request: RenderRequest): Promise<RenderResult> {
    const templateId = resolveTemplateId(request.templateId);

    try {
      const remotionVideoUri = await tryRenderWithRemotionLocalRuntime(
        templateId,
        request,
      );
      if (remotionVideoUri) {
        if (__DEV__) {
          console.info(
            `[remotion-local] Rendered via runtime bridge for template "${templateId}".`,
          );
        }
        return {
          videoUri: remotionVideoUri,
          templateId,
          engine: "remotion-local",
        };
      }
    } catch (error) {
      if (__DEV__) {
        console.warn(
          `[remotion-local] Runtime bridge failed for template "${templateId}", falling back to FFmpeg.`,
          error,
        );
      }
    }

    if (__DEV__) {
      const reason = REMOTION_LOCAL_SPIKE_ENABLED
        ? "runtime bridge unavailable"
        : "spike disabled";
      console.info(
        `[remotion-local] Falling back to FFmpeg (${reason}) for template "${templateId}".`,
      );
    }

    return ffmpegRenderer.render({
      ...request,
      templateId,
    });
  },
  async cancel(): Promise<void> {
    try {
      await tryCancelRemotionLocalRuntime();
    } catch {
      // Ignore runtime cancel failures and continue with fallback cancel.
    }
    await ffmpegRenderer.cancel?.();
  },
};
