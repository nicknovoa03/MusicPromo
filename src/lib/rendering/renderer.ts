import { ffmpegRenderer } from "@/lib/rendering/ffmpegRenderer";
import type {
  RenderEngine,
  RenderRequest,
  RenderResult,
  Renderer,
} from "@/lib/rendering/types";

const RENDERERS: Record<RenderEngine, Renderer> = {
  ffmpeg: ffmpegRenderer,
};

export function resolveRenderEngine(request: {
  engine?: RenderEngine;
  templateId?: string;
}): RenderEngine {
  return request.engine ?? "ffmpeg";
}

export function resolveRenderer(request: {
  engine?: RenderEngine;
  templateId?: string;
} = {}): Renderer {
  return RENDERERS[resolveRenderEngine(request)];
}

export async function renderVideoWithRenderer(
  request: RenderRequest,
): Promise<RenderResult> {
  return resolveRenderer(request).render(request);
}

export async function cancelRendererWork(request: {
  engine?: RenderEngine;
  templateId?: string;
} = {}): Promise<void> {
  await resolveRenderer(request).cancel?.();
}
