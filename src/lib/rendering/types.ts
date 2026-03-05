export type RenderAspectRatio = "9:16" | "1:1";

export type RenderEngine = "ffmpeg";

export interface RenderRequest {
  templateId?: string;
  templateTweaks?: {
    spinSpeed?: number;
    recordOpacity?: number;
    backgroundBlur?: number;
    rotationStartDeg?: number;
    rotationDirection?: "cw" | "ccw";
    stageBackgroundColor?: string | null;
    stageBackgroundImageUri?: string | null;
  };
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
