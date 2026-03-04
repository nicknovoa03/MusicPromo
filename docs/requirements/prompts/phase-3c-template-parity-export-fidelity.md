# Phase 3c: Template Parity + Export Fidelity

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Parity Guide: docs/requirements/TEMPLATE_PARITY_SYSTEM.md
Current phase: Phase 3
Focus: Template Parity and Export Fidelity

## Goal

Guarantee that exported output is a one-to-one visual match of editor preview for built-in templates, while keeping export quality production-ready.

This phase establishes a repeatable "spec-first" template system so new templates are immediately exportable without visual drift.

## Scope

In scope:
- Typed template registry contract (preview + exporter + parity metadata)
- Shared template layout/tone specs consumed by both preview and FFmpeg renderers
- Production export profile defaults (high quality, debug/fast paths disabled for release flow)
- New-project default trim behavior pinned to 15 seconds
- Render pipeline hardening through media normalization and fallback command paths

Out of scope (defer):
- Automated frame-diff tooling
- User-authored templates
- Cloud rendering

## Step 1 - Template Registry Contract

Files:
- src/lib/templates.ts

Requirements:
- Keep each template registered with:
  - `StageComponent`
  - `renderVideo`
  - `parity.layoutSpec`
  - `parity.vinylTone`
- Ensure IDs remain stable (`simple-spin`, `spinning-cd`)
- Keep default template deterministic for fresh projects

## Step 2 - Shared Spec Sources

Files:
- src/lib/simpleSpinTemplateSpec.ts
- src/lib/spinningCdTemplateSpec.ts
- src/lib/vinylTemplateSpec.ts

Requirements:
- Centralize geometry/layout values in template spec files
- Centralize vinyl tone values (shade/label/hole + alpha)
- Provide utilities needed by both React Native preview and FFmpeg command generation

## Step 3 - Preview Uses Shared Specs

Files:
- src/components/create/SimpleSpinTemplateStage.tsx
- src/components/create/SpinningCdTemplateStage.tsx
- src/components/create/VinylPreview.tsx

Requirements:
- Stage layout should come from shared template spec data only
- Vinyl visual tone should be selected from shared tone IDs
- Avoid duplicate local "magic numbers" that diverge from renderer values

## Step 4 - Export Uses Shared Specs

Files:
- src/lib/renderVideo.ts

Requirements:
- FFmpeg filter graph values should read shared layout/tone specs
- Keep safe fallback path aligned with same visual contract
- Preserve selected template across preview and export path

## Step 5 - Export Quality + Trim Defaults

Files:
- src/lib/renderVideo.ts
- app/create/picker.tsx
- app/create/editor.tsx

Requirements:
- Production exports use high-quality defaults (H.264 ~8 Mbps, AAC 256 kbps, 30 FPS target)
- Debug overlay/fast render mode are not used in release path
- New projects initialize trim to 15 seconds; reopened projects preserve saved trim

## Step 6 - QA Script

1. Create a new project, confirm initial trim is 15 seconds.
2. Preview/export in Simple Spin and compare first/mid/last frames manually.
3. Preview/export in Deck and compare first/mid/last frames manually.
4. Confirm render completion and playable output in Photos.
5. Confirm export events (`video_export_started`, `video_exported`, `video_export_failed`) in PostHog.
6. Confirm no user-visible debug artifacts in exported video.

## Step 7 - Documentation Updates

After implementation, update:
- docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
- docs/requirements/AGENT_DESIGN_REQUIREMENTS.md (Decisions Log)
- docs/requirements/summary.json
- docs/requirements/TEMPLATE_PARITY_SYSTEM.md
- docs/requirements/prompts/phase-3-placeholder.md

Document the parity contract so future templates follow the same preview/export rules by default.
```
