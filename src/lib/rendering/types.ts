export type RenderAspectRatio = "9:16" | "1:1";

export type RenderEngine = "ffmpeg" | "remotion-local";

export interface RenderRequest {
  templateId?: string;
  photoUri: string;
  audioUri: string;
  trimStart: number;
  trimEnd: number;
  aspectRatio: RenderAspectRatio;
  debugRenderModeBadge?: boolean;
  fastMode?: boolean;
  onProgress?: (percent: number) => void;
  engine?: RenderEngine;
}

export interface RenderResult {
  videoUri: string;
  templateId: string;
  engine: RenderEngine;
}

export interface Renderer {
  readonly engine: RenderEngine;
  render(request: RenderRequest): Promise<RenderResult>;
  cancel?(): Promise<void>;
}
