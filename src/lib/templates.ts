import type { ComponentType } from "react";
import { SimpleSpinTemplateStage } from "@/components/create/SimpleSpinTemplateStage";
import { GraphicPopTemplateStage } from "@/components/create/GraphicPopTemplateStage";
import {
  type RenderOptions,
  renderGraphicPopVideo,
  renderSimpleSpinVideo,
} from "@/lib/renderVideo";
import type { VinylToneId } from "@/lib/vinylTemplateSpec";

export interface TemplateStageProps {
  width: number;
  height: number;
  aspectRatio: "9:16" | "1:1";
  photoUri?: string | null;
  isPlaying: boolean;
  playbackLabel: string;
  trackTitle: string;
  subtitle: string;
  templateTweaks?: TemplateTweaks;
  onTogglePlay?: () => void;
}

export interface TemplateTweaks {
  spinSpeed: number;
  recordOpacity: number;
  backgroundBlur: number;
  rotationStartDeg: number;
  rotationDirection: "cw" | "ccw";
  stageBackgroundColor?: string | null;
  stageBackgroundImageUri?: string | null;
}

export const DEFAULT_TEMPLATE_TWEAKS: TemplateTweaks = {
  spinSpeed: 1,
  recordOpacity: 1,
  backgroundBlur: 0,
  rotationStartDeg: 0,
  rotationDirection: "cw",
  stageBackgroundColor: null,
  stageBackgroundImageUri: null,
};

export interface TemplateTweaksRoutePayload {
  v: 1 | 2 | 3;
  spinSpeed: number;
  recordOpacity: number;
  backgroundBlur?: number;
  rotationStartDeg?: number;
  rotationDirection?: "cw" | "ccw";
  stageBackgroundColor: string | null;
  stageBackgroundImageUri?: string | null;
}

const MIN_SPIN_SPEED = 0.25;
const MAX_SPIN_SPEED = 4;
const MIN_RECORD_OPACITY = 0.35;
const MAX_RECORD_OPACITY = 1;
const MIN_BACKGROUND_BLUR = 0;
const MAX_BACKGROUND_BLUR = 24;
const MIN_ROTATION_START_DEG = -180;
const MAX_ROTATION_START_DEG = 180;

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(value, max));
}

function sanitizeBackgroundColor(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : null;
}

function sanitizeBackgroundImageUri(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed;
}

function sanitizeRotationDirection(
  value?: string | null,
): "cw" | "ccw" {
  return value === "ccw" ? "ccw" : "cw";
}

export function normalizeTemplateTweaks(
  input?: Partial<TemplateTweaks> | null,
): TemplateTweaks {
  return {
    spinSpeed: clampNumber(
      input?.spinSpeed ?? DEFAULT_TEMPLATE_TWEAKS.spinSpeed,
      MIN_SPIN_SPEED,
      MAX_SPIN_SPEED,
    ),
    recordOpacity: clampNumber(
      input?.recordOpacity ?? DEFAULT_TEMPLATE_TWEAKS.recordOpacity,
      MIN_RECORD_OPACITY,
      MAX_RECORD_OPACITY,
    ),
    backgroundBlur: clampNumber(
      input?.backgroundBlur ?? DEFAULT_TEMPLATE_TWEAKS.backgroundBlur,
      MIN_BACKGROUND_BLUR,
      MAX_BACKGROUND_BLUR,
    ),
    rotationStartDeg: clampNumber(
      input?.rotationStartDeg ?? DEFAULT_TEMPLATE_TWEAKS.rotationStartDeg,
      MIN_ROTATION_START_DEG,
      MAX_ROTATION_START_DEG,
    ),
    rotationDirection: sanitizeRotationDirection(input?.rotationDirection),
    stageBackgroundColor: sanitizeBackgroundColor(input?.stageBackgroundColor),
    stageBackgroundImageUri: sanitizeBackgroundImageUri(
      input?.stageBackgroundImageUri,
    ),
  };
}

export function serializeTemplateTweaksParam(value: TemplateTweaks): string {
  const normalized = normalizeTemplateTweaks(value);
  const payload: TemplateTweaksRoutePayload = {
    v: 3,
    spinSpeed: normalized.spinSpeed,
    recordOpacity: normalized.recordOpacity,
    backgroundBlur: normalized.backgroundBlur,
    rotationStartDeg: normalized.rotationStartDeg,
    rotationDirection: normalized.rotationDirection,
    stageBackgroundColor: normalized.stageBackgroundColor ?? null,
    stageBackgroundImageUri: normalized.stageBackgroundImageUri ?? null,
  };
  return encodeURIComponent(JSON.stringify(payload));
}

export function parseTemplateTweaksParam(
  rawParam?: string | null,
): TemplateTweaks | null {
  if (!rawParam) return null;
  try {
    const decoded = decodeURIComponent(rawParam);
    const parsed = JSON.parse(decoded) as Partial<TemplateTweaksRoutePayload>;
    if (!parsed || (parsed.v !== 1 && parsed.v !== 2 && parsed.v !== 3)) {
      return null;
    }
    return normalizeTemplateTweaks({
      spinSpeed: parsed.spinSpeed,
      recordOpacity: parsed.recordOpacity,
      backgroundBlur: parsed.backgroundBlur,
      rotationStartDeg: parsed.rotationStartDeg,
      rotationDirection: parsed.rotationDirection,
      stageBackgroundColor: parsed.stageBackgroundColor,
      stageBackgroundImageUri: parsed.stageBackgroundImageUri,
    });
  } catch {
    return null;
  }
}

export interface TemplateDefinition {
  id: string;
  name: string;
  StageComponent: ComponentType<TemplateStageProps>;
  renderVideo: (options: RenderOptions) => Promise<string>;
  parity: {
    layoutSpec: string;
    vinylTone: VinylToneId;
  };
}

export const DEFAULT_TEMPLATE_ID = "simple-spin";

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  "simple-spin": {
    id: "simple-spin",
    name: "Vinyl",
    StageComponent: SimpleSpinTemplateStage,
    renderVideo: renderSimpleSpinVideo,
    parity: {
      layoutSpec: "simpleSpinTemplateSpec",
      vinylTone: "simple-spin",
    },
  },
  "graphic-pop": {
    id: "graphic-pop",
    name: "CD",
    StageComponent: GraphicPopTemplateStage,
    renderVideo: renderGraphicPopVideo,
    parity: {
      layoutSpec: "graphicPopTemplateSpec",
      vinylTone: "graphic-pop",
    },
  },
};

export function resolveTemplateId(templateId?: string | null): string {
  if (!templateId) return DEFAULT_TEMPLATE_ID;
  return TEMPLATE_DEFINITIONS[templateId] ? templateId : DEFAULT_TEMPLATE_ID;
}

export function getTemplateDefinition(templateId?: string | null): TemplateDefinition {
  return TEMPLATE_DEFINITIONS[resolveTemplateId(templateId)];
}

export function listTemplateDefinitions(): TemplateDefinition[] {
  return [
    TEMPLATE_DEFINITIONS["simple-spin"],
    TEMPLATE_DEFINITIONS["graphic-pop"],
  ];
}
