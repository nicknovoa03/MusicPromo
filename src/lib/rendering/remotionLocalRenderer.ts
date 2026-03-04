import type { Renderer, RenderRequest, RenderResult } from "@/lib/rendering/types";

export const remotionLocalRenderer: Renderer = {
  engine: "remotion-local",
  async render(_request: RenderRequest): Promise<RenderResult> {
    throw new Error(
      "Remotion local renderer is not implemented yet. Use the FFmpeg renderer for now.",
    );
  },
  async cancel(): Promise<void> {
    // No-op until the renderer is implemented.
  },
};
