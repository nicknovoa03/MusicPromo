import type { RenderAspectRatio } from "@/lib/rendering/types";

export const SPINNING_CD_TEMPLATE_ID = "spinning-cd" as const;
const DEFAULT_TRIM_DURATION_SEC = 15;

export interface SpinningCdComposition {
  readonly id: typeof SPINNING_CD_TEMPLATE_ID;
  readonly fps: number;
  readonly outputDimensions: Record<
    RenderAspectRatio,
    {
      readonly width: number;
      readonly height: number;
    }
  >;
  readonly cdSizeRatio: number;
  readonly centerHoleRatio: number;
  readonly spinDurationSec: number;
  readonly backgroundDarkOverlayOpacity: number;
  readonly backgroundBlur: {
    readonly x: number;
    readonly y: number;
  };
}

export const spinningCdComposition: SpinningCdComposition = {
  id: SPINNING_CD_TEMPLATE_ID,
  fps: 30,
  outputDimensions: {
    "9:16": { width: 1080, height: 1920 },
    "1:1": { width: 1080, height: 1080 },
  },
  cdSizeRatio: 0.45,
  centerHoleRatio: 0.12,
  spinDurationSec: 4,
  backgroundDarkOverlayOpacity: 0.6,
  backgroundBlur: { x: 40, y: 20 },
};

export interface NormalizedSpinningCdRequest {
  templateId: typeof SPINNING_CD_TEMPLATE_ID;
  aspectRatio: RenderAspectRatio;
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
}

export function isSpinningCdTemplate(templateId?: string): boolean {
  return (templateId?.trim() || SPINNING_CD_TEMPLATE_ID) === SPINNING_CD_TEMPLATE_ID;
}

export function resolveSpinningCdTemplateId(
  templateId?: string,
): typeof SPINNING_CD_TEMPLATE_ID {
  const resolvedId = templateId?.trim() || SPINNING_CD_TEMPLATE_ID;
  if (resolvedId !== SPINNING_CD_TEMPLATE_ID) {
    throw new Error(
      `Template "${resolvedId}" is not supported yet. Only "${SPINNING_CD_TEMPLATE_ID}" is available.`,
    );
  }
  return SPINNING_CD_TEMPLATE_ID;
}

function normalizeTrimRange(trimStart: number, trimEnd: number): {
  trimStartSec: number;
  trimEndSec: number;
  durationSec: number;
} {
  const safeStart = Number.isFinite(trimStart) ? Math.max(0, trimStart) : 0;
  const safeEnd =
    Number.isFinite(trimEnd) && trimEnd > safeStart
      ? trimEnd
      : safeStart + DEFAULT_TRIM_DURATION_SEC;
  const minDuration = 1 / spinningCdComposition.fps;
  const durationSec = Math.max(safeEnd - safeStart, minDuration);

  return {
    trimStartSec: safeStart,
    trimEndSec: safeStart + durationSec,
    durationSec,
  };
}

export function normalizeSpinningCdRequest(input: {
  templateId?: string;
  aspectRatio: RenderAspectRatio;
  trimStart: number;
  trimEnd: number;
}): NormalizedSpinningCdRequest {
  const templateId = resolveSpinningCdTemplateId(input.templateId);
  const aspectRatio = input.aspectRatio === "1:1" ? "1:1" : "9:16";
  const trim = normalizeTrimRange(input.trimStart, input.trimEnd);

  return {
    templateId,
    aspectRatio,
    trimStartSec: trim.trimStartSec,
    trimEndSec: trim.trimEndSec,
    durationSec: trim.durationSec,
  };
}

export function getSpinningCdSpinExpression(): string {
  return `2*PI*t/${spinningCdComposition.spinDurationSec}`;
}
