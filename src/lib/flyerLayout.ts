import type { FlyerAspectRatio } from "@/lib/flyerDraft";

/** Global scale bump for flyer typography, spacing, and preview chrome. */
export const FLYER_CONTENT_SCALE = 1.2;

/** Extra enlargement for 4:5 — primary preview/export post ratio. */
export const FLYER_COMPACT_SCALE_BOOST = 1.28;

export function isFlyerCompact(aspectRatio?: FlyerAspectRatio): boolean {
  return aspectRatio === "4:5";
}

export function flyerLayoutScale(aspectRatio?: FlyerAspectRatio): number {
  // 4:5 uses the same width basis as 9:16; compact boost sizes the post canvas.
  return 1;
}

/** Scale a layout value for the given aspect ratio. */
export function flyerSize(
  value: number,
  aspectRatio?: FlyerAspectRatio,
): number {
  const compactBoost =
    aspectRatio === "4:5" ? FLYER_COMPACT_SCALE_BOOST : 1;
  return Math.round(
    value * flyerLayoutScale(aspectRatio) * FLYER_CONTENT_SCALE * compactBoost,
  );
}

/** Display title line height — native clips glyphs when lineHeight < fontSize. */
export function flyerTitleLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.12);
}

/** Multiline display titles (Vintage) — extra headroom for Anton ascenders on iOS. */
export function flyerStackedTitleLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.2);
}

/** Script / handwriting fonts need extra room below the baseline on native. */
export function flyerScriptLineHeight(fontSize: number): number {
  return Math.round(fontSize * 1.28);
}
