import type { ComponentType } from "react";
import { SimpleSpinTemplateStage } from "@/components/create/SimpleSpinTemplateStage";
import { GraphicPopTemplateStage } from "@/components/create/GraphicPopTemplateStage";
import { WholeTemplateStage } from "@/components/create/WholeTemplateStage";
import {
  type RenderOptions,
  renderGraphicPopVideo,
  renderWholeVideo,
  renderSimpleSpinVideo,
} from "@/lib/renderVideo";
import type { VinylToneId } from "@/lib/vinylTemplateSpec";

export interface TemplateStageProps {
  width: number;
  height: number;
  aspectRatio: "9:16" | "4:5" | "1:1";
  photoUri?: string | null;
  isPlaying: boolean;
  playbackLabel: string;
  trackTitle: string;
  subtitle: string;
  templateTweaks?: TemplateTweaks;
  onTogglePlay?: () => void;
  showWatermark?: boolean;
}

export interface TemplateTweaks {
  spinSpeed: number;
  recordSize: number;
  artworkScale: number;
  recordTransparency: number;
  backgroundBlur: number;
  rotationStartDeg: number;
  rotationDirection: "cw" | "ccw";
  stageBackgroundColor?: string | null;
  stageBackgroundImageUri?: string | null;
  showWatermark: boolean;
}

export const DEFAULT_TEMPLATE_TWEAKS: TemplateTweaks = {
  spinSpeed: 1,
  recordSize: 1,
  artworkScale: 3,
  recordTransparency: 0,
  backgroundBlur: 0,
  rotationStartDeg: 0,
  rotationDirection: "cw",
  stageBackgroundColor: null,
  stageBackgroundImageUri: null,
  showWatermark: true,
};

export interface TemplateTweaksRoutePayload {
  v: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  spinSpeed: number;
  recordSize?: number;
  artworkScale?: number;
  recordTransparency?: number;
  recordOpacity?: number;
  backgroundBlur?: number;
  rotationStartDeg?: number;
  rotationDirection?: "cw" | "ccw";
  stageBackgroundColor: string | null;
  stageBackgroundImageUri?: string | null;
  showWatermark?: boolean;
}

const MIN_SPIN_SPEED = 0.25;
const MAX_SPIN_SPEED = 4;
const MIN_RECORD_SIZE = 0.75;
const MAX_RECORD_SIZE = 1.3;
const MIN_ARTWORK_SCALE = 1.5;
const MAX_ARTWORK_SCALE = 4.5;
const MIN_RECORD_TRANSPARENCY = 0;
const MAX_RECORD_TRANSPARENCY = 0.65;
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

function sanitizeShowWatermark(value?: boolean | null): boolean {
  return value !== false;
}

function opacityToTransparency(opacity: number): number {
  return clampNumber(1 - opacity, MIN_RECORD_TRANSPARENCY, MAX_RECORD_TRANSPARENCY);
}

export function normalizeTemplateTweaks(
  input?: (Partial<TemplateTweaks> & { recordOpacity?: number }) | null,
): TemplateTweaks {
  const recordTransparencyInput = Number.isFinite(input?.recordTransparency)
    ? input?.recordTransparency
    : Number.isFinite(input?.recordOpacity)
      ? opacityToTransparency(input?.recordOpacity ?? 1)
      : DEFAULT_TEMPLATE_TWEAKS.recordTransparency;
  return {
    spinSpeed: clampNumber(
      input?.spinSpeed ?? DEFAULT_TEMPLATE_TWEAKS.spinSpeed,
      MIN_SPIN_SPEED,
      MAX_SPIN_SPEED,
    ),
    recordSize: clampNumber(
      input?.recordSize ?? DEFAULT_TEMPLATE_TWEAKS.recordSize,
      MIN_RECORD_SIZE,
      MAX_RECORD_SIZE,
    ),
    artworkScale: clampNumber(
      input?.artworkScale ?? DEFAULT_TEMPLATE_TWEAKS.artworkScale,
      MIN_ARTWORK_SCALE,
      MAX_ARTWORK_SCALE,
    ),
    recordTransparency: clampNumber(
      recordTransparencyInput ?? DEFAULT_TEMPLATE_TWEAKS.recordTransparency,
      MIN_RECORD_TRANSPARENCY,
      MAX_RECORD_TRANSPARENCY,
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
    showWatermark: sanitizeShowWatermark(input?.showWatermark),
  };
}

export function serializeTemplateTweaksParam(value: TemplateTweaks): string {
  const normalized = normalizeTemplateTweaks(value);
  const payload: TemplateTweaksRoutePayload = {
    v: 7,
    spinSpeed: normalized.spinSpeed,
    recordSize: normalized.recordSize,
    artworkScale: normalized.artworkScale,
    recordTransparency: normalized.recordTransparency,
    backgroundBlur: normalized.backgroundBlur,
    rotationStartDeg: normalized.rotationStartDeg,
    rotationDirection: normalized.rotationDirection,
    stageBackgroundColor: normalized.stageBackgroundColor ?? null,
    stageBackgroundImageUri: normalized.stageBackgroundImageUri ?? null,
    showWatermark: normalized.showWatermark,
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
    if (
      !parsed ||
      (parsed.v !== 1 &&
        parsed.v !== 2 &&
        parsed.v !== 3 &&
        parsed.v !== 4 &&
        parsed.v !== 5 &&
        parsed.v !== 6 &&
        parsed.v !== 7)
    ) {
      return null;
    }

    // Legacy payloads used 1.5 as the default baseline.
    // Rebase that prior default to the new normal (3 -> shown as 1x).
    const normalizedLegacyArtworkScale =
      parsed.v <= 5 && Number.isFinite(parsed.artworkScale)
        ? Math.abs((parsed.artworkScale ?? 0) - 1.5) < 0.001
          ? 3
          : parsed.artworkScale
        : parsed.artworkScale;

    return normalizeTemplateTweaks({
      spinSpeed: parsed.spinSpeed,
      recordSize: parsed.recordSize,
      artworkScale: normalizedLegacyArtworkScale,
      recordTransparency: parsed.recordTransparency,
      recordOpacity: parsed.recordOpacity,
      backgroundBlur: parsed.backgroundBlur,
      rotationStartDeg: parsed.rotationStartDeg,
      rotationDirection: parsed.rotationDirection,
      stageBackgroundColor: parsed.stageBackgroundColor,
      stageBackgroundImageUri: parsed.stageBackgroundImageUri,
      showWatermark: parsed.showWatermark,
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

export const TEMPLATE_ID_CD = "cd";
export const TEMPLATE_ID_VINYL = "vinyl";
export const TEMPLATE_ID_WHOLE = "whole";

const LEGACY_TEMPLATE_ID_ALIASES: Record<string, string> = {
  "graphic-pop": TEMPLATE_ID_CD,
  "simple-spin": TEMPLATE_ID_VINYL,
  hybrid: TEMPLATE_ID_WHOLE,
};

export const DEFAULT_TEMPLATE_ID = TEMPLATE_ID_WHOLE;

const TEMPLATE_DEFINITIONS: Record<string, TemplateDefinition> = {
  [TEMPLATE_ID_VINYL]: {
    id: TEMPLATE_ID_VINYL,
    name: "Vinyl",
    StageComponent: SimpleSpinTemplateStage,
    renderVideo: renderSimpleSpinVideo,
    parity: {
      layoutSpec: "simpleSpinTemplateSpec",
      vinylTone: "simple-spin",
    },
  },
  [TEMPLATE_ID_CD]: {
    id: TEMPLATE_ID_CD,
    name: "CD",
    StageComponent: GraphicPopTemplateStage,
    renderVideo: renderGraphicPopVideo,
    parity: {
      layoutSpec: "graphicPopTemplateSpec",
      vinylTone: "graphic-pop",
    },
  },
  [TEMPLATE_ID_WHOLE]: {
    id: TEMPLATE_ID_WHOLE,
    name: "Whole",
    StageComponent: WholeTemplateStage,
    renderVideo: renderWholeVideo,
    parity: {
      layoutSpec: "graphicPopTemplateSpec",
      vinylTone: "graphic-pop",
    },
  },
};

export function resolveTemplateId(templateId?: string | null): string {
  if (!templateId) return DEFAULT_TEMPLATE_ID;
  const trimmed = templateId.trim();
  if (!trimmed) return DEFAULT_TEMPLATE_ID;
  if (TEMPLATE_DEFINITIONS[trimmed]) return trimmed;
  const mappedLegacyId = LEGACY_TEMPLATE_ID_ALIASES[trimmed];
  return mappedLegacyId && TEMPLATE_DEFINITIONS[mappedLegacyId]
    ? mappedLegacyId
    : DEFAULT_TEMPLATE_ID;
}

export function getTemplateDefinition(templateId?: string | null): TemplateDefinition {
  return TEMPLATE_DEFINITIONS[resolveTemplateId(templateId)];
}

export function listTemplateDefinitions(): TemplateDefinition[] {
  return [
    TEMPLATE_DEFINITIONS[TEMPLATE_ID_WHOLE],
    TEMPLATE_DEFINITIONS[TEMPLATE_ID_CD],
    TEMPLATE_DEFINITIONS[TEMPLATE_ID_VINYL],
  ];
}
