import { cancelCurrentRender, renderSpinningCdVideo } from "@/lib/renderVideo";
import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";

const DEFAULT_TEMPLATE_ID = "spinning-cd";

function resolveTemplateId(request: RenderRequest): string {
  return request.templateId?.trim() || DEFAULT_TEMPLATE_ID;
}

export const ffmpegRenderer: Renderer = {
  engine: "ffmpeg",
  async render(request: RenderRequest): Promise<RenderResult> {
    const templateId = resolveTemplateId(request);

    if (templateId !== DEFAULT_TEMPLATE_ID) {
      throw new Error(
        `Template "${templateId}" is not supported by the FFmpeg renderer.`,
      );
    }

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
