import type { ComponentType } from "react";
import { SimpleSpinTemplateStage } from "@/components/create/SimpleSpinTemplateStage";
import { SpinningCdTemplateStage } from "@/components/create/SpinningCdTemplateStage";
import {
  type RenderOptions,
  renderSimpleSpinVideo,
  renderSpinningCdVideo,
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
  onTogglePlay?: () => void;
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
    name: "Simple Spin",
    StageComponent: SimpleSpinTemplateStage,
    renderVideo: renderSimpleSpinVideo,
    parity: {
      layoutSpec: "simpleSpinTemplateSpec",
      vinylTone: "simple-spin",
    },
  },
  "spinning-cd": {
    id: "spinning-cd",
    name: "Deck",
    StageComponent: SpinningCdTemplateStage,
    renderVideo: renderSpinningCdVideo,
    parity: {
      layoutSpec: "spinningCdTemplateSpec",
      vinylTone: "spinning-cd",
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
  return [TEMPLATE_DEFINITIONS[DEFAULT_TEMPLATE_ID]];
}
