import { ffmpegRenderer } from "@/lib/rendering/ffmpegRenderer";
import { remotionLocalRenderer } from "@/lib/rendering/remotionLocalRenderer";
import type {
  RenderEngine,
  RenderRequest,
  RenderResult,
  Renderer,
} from "@/lib/rendering/types";

const DEFAULT_ENGINE: RenderEngine = "ffmpeg";

const RENDERERS: Record<RenderEngine, Renderer> = {
  ffmpeg: ffmpegRenderer,
  "remotion-local": remotionLocalRenderer,
};

export function resolveRenderer(engine?: RenderEngine): Renderer {
  return RENDERERS[engine ?? DEFAULT_ENGINE];
}

export async function renderVideoWithRenderer(
  request: RenderRequest,
): Promise<RenderResult> {
  return resolveRenderer(request.engine).render(request);
}

export async function cancelRendererWork(engine?: RenderEngine): Promise<void> {
  await resolveRenderer(engine).cancel?.();
}
