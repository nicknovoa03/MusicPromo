import { cancelCurrentRender } from "@/lib/renderVideo";
import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";
import { getTemplateDefinition, resolveTemplateId } from "@/lib/templates";

export const ffmpegRenderer: Renderer = {
  engine: "ffmpeg",
  async render(request: RenderRequest): Promise<RenderResult> {
    const templateId = resolveTemplateId(request.templateId);
    const templateDefinition = getTemplateDefinition(templateId);
    const videoUri = await templateDefinition.renderVideo({
      photoUri: request.photoUri,
      audioUri: request.audioUri,
      trimStart: request.trimStart,
      trimEnd: request.trimEnd,
      aspectRatio: request.aspectRatio,
      debugRenderModeBadge: request.debugRenderModeBadge,
      fastMode: request.fastMode,
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
