import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";
import { ffmpegRenderer } from "@/lib/rendering/ffmpegRenderer";
import { resolveSpinningCdTemplateId } from "@/lib/rendering/templates/spinningCdComposition";

export const remotionLocalRenderer: Renderer = {
  engine: "remotion-local",
  async render(request: RenderRequest): Promise<RenderResult> {
    const templateId = resolveSpinningCdTemplateId(request.templateId);

    // Limitation: Remotion does not currently provide a production-ready on-device
    // React Native renderer runtime for this Expo app. Keep this adapter behind
    // the abstraction and run local export via the FFmpeg backend for now.
    if (__DEV__) {
      console.info(
        "[remotion-local] Falling back to FFmpeg local renderer pending native Remotion runtime support.",
      );
    }

    return ffmpegRenderer.render({
      ...request,
      templateId,
    });
  },
  async cancel(): Promise<void> {
    await ffmpegRenderer.cancel?.();
  },
};
