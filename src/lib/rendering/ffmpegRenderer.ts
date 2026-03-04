import { cancelCurrentRender, renderSpinningCdVideo } from "@/lib/renderVideo";
import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";
import { resolveSpinningCdTemplateId } from "@/lib/rendering/templates/spinningCdComposition";

export const ffmpegRenderer: Renderer = {
  engine: "ffmpeg",
  async render(request: RenderRequest): Promise<RenderResult> {
    const templateId = resolveSpinningCdTemplateId(request.templateId);

    const videoUri = await renderSpinningCdVideo({
      photoUri: request.photoUri,
      audioUri: request.audioUri,
      trimStart: request.trimStart,
      trimEnd: request.trimEnd,
      aspectRatio: request.aspectRatio,
      onProgress: request.onProgress,
    });

    return {
      videoUri,
      templateId,
      engine: "ffmpeg",
    };
  },
  async cancel(): Promise<void> {
    await cancelCurrentRender();
  },
};
