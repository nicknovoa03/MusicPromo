# Phase 5e: Vinyl Render Shell Optimization

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: Phase 5e
Focus: Reduce Vinyl export render time by replacing procedural per-frame vinyl construction with pre-baked PNG shell compositing, while preserving preview/export parity for both Vinyl and CD

## Prerequisites

- Phase 5d is merged (or validated locally).
- Current create/editor controls for Vinyl are stable:
  - Artwork size options are fixed to 3 discrete states
  - Spin/transparency behavior is correct
- Existing export correctness baseline is known (visual + trim parity).

Before writing code:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` (Section 3.1).
- Keep scope on render-pipeline performance for Vinyl template only.
- Do not change analytics event names unless additive.

## Goal

Speed up Vinyl exports by pre-baking expensive visual layers (grooves/rims/shading/highlights) into static transparent PNG assets and compositing user artwork inside those shells at runtime, instead of regenerating those layers with heavy FFmpeg `geq` math every frame.

Delivery strategy:
- First ship/validate `vinyl_shell_normal.png` until preview/export parity is confirmed.
- Then derive and validate `vinyl_shell_small.png` and `vinyl_shell_large.png` from the proven normal shell.

## Good Model (Target Contract)

1. Vinyl remains visually on-brand and close to current output.
2. Vinyl export time is reduced to the same order of magnitude as CD export time (currently Vinyl is significantly slower).
3. Whole template render behavior remains unchanged.
4. Existing controls still work:
   - Artwork size (3 states)
   - Spin speed
   - Spin start angle/direction
   - Transparency
5. Export reliability does not regress (fallback path still exists).
6. Visual parity checks are explicit:
   - CD preview vs CD export remain aligned.
   - Vinyl preview vs Vinyl export remain aligned.

## Scope

In scope:
- Use existing pre-baked vinyl shell image assets in `assets/` (3 size variants aligned to current artwork-size states)
- Runtime mapping from artwork-size selection to shell asset
- FFmpeg graph simplification for Vinyl render path
- Optional perf diagnostics logging in dev

Out of scope:
- Rewriting non-Vinyl templates
- Changing trim/export/share contracts
- Changing user-facing template controls
- Reworking app navigation/surface UI

## Asset Contract

Pre-baked transparent PNG assets for Vinyl shell layers already exist in `assets/`:
- `assets/vinyl_shell_small.png`
- `assets/vinyl_shell_normal.png`
- `assets/vinyl_shell_large.png`

These assets include grooves/rims/shading details that currently come from procedural layers, with transparent regions where dynamic user artwork should remain visible.

Validation order:
  1. `vinyl_shell_normal.png` first (parity gate required before continuing)
  2. `vinyl_shell_small.png` and `vinyl_shell_large.png` second (validated against normal reference)

## Step 1 - Integrate and Validate Normal Vinyl Shell

Files:
- `assets/vinyl_shell_normal.png` (existing)
- `src/lib/renderVideo.ts`
- optional helper file in `src/lib/` for asset metadata

Requirements:
- Integrate runtime support for existing `vinyl_shell_normal.png` first.
- Keep rendering path deterministic for both 9:16 and 1:1 outputs.
- Do not proceed to small/large until normal shell parity passes.

## Step 2 - Simplify Vinyl FFmpeg Graph (Normal First)

Files:
- `src/lib/renderVideo.ts`

Requirements:
- For Vinyl variant path, replace heavy procedural disc layer construction (`geq`-heavy grooves/rims stack) with:
  1. User artwork prep (crop/scale)
  2. Composite artwork + selected shell asset
  3. Rotate/composite into scene
- Preserve transparency behavior by applying record-alpha consistently to final composed disc.
- Preserve spin math and directional controls.
- Preserve center-artwork placement so preview and export framing remain matched.

## Step 3 - Add Small/Large Shells From Normal Baseline

Files:
- `assets/vinyl_shell_small.png` (existing)
- `assets/vinyl_shell_large.png` (existing)
- `src/lib/renderVideo.ts`
- optional helper file in `src/lib/` for asset metadata

Requirements:
- Add deterministic mapping from artwork-size option index/state to shell asset.
- Keep mapping explicit and easy to update.
- Ensure small/normal/large all preserve center alignment and visual rhythm from normal baseline.

## Step 4 - Keep Reliability + Fallback Safety

Files:
- `src/lib/renderVideo.ts`

Requirements:
- Keep existing fallback strategy intact (hardware -> software -> safe fallback).
- If shell asset load or graph setup fails, fail gracefully and retain actionable error logs.
- Do not remove existing cancellation/progress semantics.

## Step 5 - Validate Visual + Performance Parity (With Screenshots)

Files:
- `src/lib/renderVideo.ts`
- optional docs update with benchmark notes

Requirements:
- Add lightweight dev timing logs for render duration by template/path.
- Compare baseline vs optimized Vinyl on same device + same 15s clip.
- Ensure output remains acceptable across all three artwork-size states.
- Capture and review screenshot evidence for:
  - CD preview vs CD export
  - Vinyl preview vs Vinyl export (small/normal/large)
- Parity target: "visually equivalent" composition/placement and no obvious style drift.

## Step 6 - QA and Acceptance

QA script:
1. Implement and verify normal Vinyl shell only.
2. Capture screenshots:
   - CD preview and CD export
   - Vinyl preview (normal) and Vinyl export (normal)
3. Confirm normal parity before enabling small/large shells.
4. Add small/large shells and export all three Vinyl sizes.
5. Capture screenshots for Vinyl small/normal/large preview vs export pairs.
6. Confirm spin speed/start angle/direction still affect output correctly.
7. Confirm transparency control still affects final disc opacity.
8. Compare export duration against prior baseline for same source media.
9. Confirm Whole template output/time remains unchanged.
10. Verify cancel/retry/export-failure paths still function.
11. Run `npm run lint:all`.

Acceptance criteria:
- Vinyl render path uses pre-baked shell compositing for the three artwork-size states.
- Vinyl export time is comparable to CD export time on the same device and source media.
- Visual output remains production-acceptable and controls retain expected behavior.
- Screenshot review confirms CD and Vinyl preview/export parity is maintained.
- No regressions in Whole template or export reliability contracts.
```
