# Phase 4: Remotion Local Integration

```txt
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 4
Focus: Add Remotion Locally (Preview + Export) Behind Renderer Abstraction

## Prerequisites

Phases 0-3 are complete and stable. Core create/export/share/project-history flows are already in production shape.
Renderer abstraction scaffold already exists in:
- src/lib/rendering/types.ts
- src/lib/rendering/renderer.ts
- src/lib/rendering/ffmpegRenderer.ts
- src/lib/rendering/remotionLocalRenderer.ts

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan -> Implement -> Verify -> Refactor -> Update PRD (Section 2.2).

## Objective

Integrate Remotion as a local/on-device renderer so preview and export share one composition source of truth, with no cloud-render dependency for MVP.

## Step 0 - Constraints (Non-Negotiable)

- Rendering remains local/on-device for preview and export
- App should still function for local export without internet
- Existing create/editor/share UX remains intact
- Keep FFmpeg adapter available as fallback until Remotion is proven stable

## Step 1 - Implement Remotion Local Adapter

Implement `src/lib/rendering/remotionLocalRenderer.ts` so it performs real local rendering and returns the shared `RenderResult` contract.

Requirements:
- Consume `RenderRequest` from the abstraction layer
- Emit progress updates via `onProgress`
- Return local video URI output for share/save flow compatibility
- Support cancel behavior (or explicit no-op with documented limitation)

## Step 2 - Migrate One Template End-to-End

Migrate one existing template first (recommended: `spinning-cd`) so both:
- Preview path uses Remotion composition
- Export path uses the same Remotion composition locally

Do not migrate all templates in this step. Prove one template fully first.

## Step 3 - Wire Runtime Selection

Use the existing renderer abstraction to select engine cleanly:
- Keep `ffmpeg` as fallback
- Add a controlled switch (feature flag or constant) for `remotion-local`
- No direct Remotion imports inside screen-level UI components

## Step 4 - Go/No-Go Gates (Required)

Remotion local is accepted for MVP only if all are true on real devices:
1. 30-second export completes in <= 60 seconds
2. Audio sync drift is not perceptible (target <= 100ms)
3. 10 consecutive exports complete without crash
4. Preview and export visuals are effectively identical for the migrated template

If any gate fails, do not force Remotion for MVP export.

## Step 5 - Outcome Path

If Remotion passes:
- Promote Remotion local renderer as the primary backend
- Keep FFmpeg adapter temporarily for rollback safety
- Queue second template migration immediately after pass decision

If Remotion fails:
- Keep renderer abstraction in place
- Continue shipping with FFmpeg renderer
- Document failure reason and exact blockers for future retry

## Step 6 - Regression Checklist

1. Re-run Phase 1 render regression checklist
2. Export both 9:16 and 1:1 for the migrated template
3. Verify cancel/retry behavior still works
4. Verify project re-export updates existing records (no duplicates)
5. Verify share + camera-roll save flows unchanged

## Step 7 - Documentation Updates

Update all of the following after implementation:
- docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md (Phase 4 milestone + risks/open questions)
- docs/requirements/AGENT_DESIGN_REQUIREMENTS.md (Decisions Log + phase mapping)
- docs/requirements/summary.json (video rendering strategy + epic phase mapping)
```
