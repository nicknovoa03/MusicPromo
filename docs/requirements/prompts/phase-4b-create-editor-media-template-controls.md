# Phase 4b: Create Editor — Edit Template + Template Settings Controls

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References:
- docs/design-inspiration/create-flow/
- docs/design-inspiration/temp/IMG_9206.png
- stitch_exports/14408626753917029956/143fb3722b524a95b015b41f72947e4e/screen.png
- stitch_exports/14408626753917029956/5360119ee2e74f54aff80035fe7180a6/screen.png
Current phase: Phase 4
Focus: Create Promo Video — Editor Media/Layout Controls + Template Polish Controls

## Prerequisites

- Phase 1 create flow is working (picker + editor + export path).
- Phase 3c parity work is in place (template spec + stage parity contract).
- Current editor already supports:
  - Template selection
  - Aspect ratio selection
  - Media swap (photo/audio)
  - Audio trim controls

Before writing code:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` (Section 3.1).
- Keep this change aligned with PRD Section 6 Epic: Create Promo Video.
- Preserve v1 non-goals (no full video-editor complexity).

## Goal

Upgrade the editor control UX so users can quickly switch media/layout and then optionally dive into template polish controls, while preserving "time to fun" and non-destructive editing.

## UX Principle

- Fast primary path: swap media/template/aspect ratio in 1-2 taps.
- Advanced path: dedicated controls for visual polish (spin/transparency/background).
- Keep preview interaction feel premium and intentional, not cramped.

## Scope

In scope:
- Add a dedicated `Edit Template` surface
- Add a dedicated `Template Settings` surface
- Keep controls visually consistent with editor pill language
- Keep preview updates live while tweaking
- Preserve all editing state when moving between controls and picker

Out of scope (defer):
- New template types beyond existing curated templates
- Keyframing, timeline effects, text overlays, stickers
- Cloud rendering or remote template configs

## Step 1 - Split Controls Into Two Dedicated Surfaces

Files:
- `app/create/editor.tsx`
- `src/components/create/EditMediaModal.tsx` (or route equivalent)
- `src/components/create/TemplateCustomizeModal.tsx` (or route equivalent)

Requirements:
- Replace crowded inline controls with two clear entry points:
  - `Edit Template`
  - `Template Settings`
- `Edit Template` contains:
  - Aspect ratio pills (`9:16`, `1:1`)
  - Template selector rail
  - Change audio
  - Change photo
- `Template Settings` contains:
  - Spin speed control
  - Record transparency control
  - Stage/background tint control
- Apply/close behavior must be explicit and predictable.

## Step 2 - Keep State Non-Destructive Across Flow Hops

Files:
- `app/create/editor.tsx`
- `app/create/picker.tsx`
- `src/lib/templates.ts`

Requirements:
- Swapping photo must preserve audio, trim, template, aspect ratio, and template tweaks.
- Swapping audio must preserve photo, trim (clamped as needed), template, aspect ratio, and template tweaks.
- Re-entering editor from picker must restore the same control state.
- Template tweak contract should be typed and serializable through route params.

## Step 3 - Visual Interaction Polish For Controls

Files:
- `src/components/create/TemplateSwitcher.tsx` (if used in rail)
- `src/components/create/EditMediaModal.tsx`
- `src/components/create/TemplateCustomizeModal.tsx`

Requirements:
- Control pills must share one visual system (shape, spacing, selected state).
- Template selector should feel stable:
  - tap selects reliably
  - swipe/snaps selects reliably
  - active item is always clearly highlighted
- Add haptics on selection changes where supported.
- Keep layout compact to preserve waveform/trimmer space.

## Step 4 - Preview Fidelity + Clean Visual Layers

Files:
- `src/components/create/VinylPreview.tsx`
- `src/components/create/SimpleSpinTemplateStage.tsx`
- `src/components/create/GraphicPopTemplateStage.tsx`
- `src/lib/simpleSpinTemplateSpec.ts`
- `src/lib/graphicPopTemplateSpec.ts`

Requirements:
- Maintain polished vinyl look:
  - clean inner ring
  - balanced center shadow
  - no unintended large tinted halo behind disc
  - no stray secondary dark center circle artifacts
- Ensure template background tint only appears where intended.
- Changes in template controls should reflect immediately in preview.

## Step 5 - Analytics + QA

Files:
- `src/lib/analytics.ts`
- `app/create/editor.tsx`
- related control components

Track at minimum:
- `editor_controls_opened` (with `surface: edit_template | template_settings`)
- `template_tweak_changed` (with `control: spin_speed | record_transparency | stage_background`)
- `template_selected_from_edit_media`
- `media_swap_started_from_edit_media`

QA script:
1. Open editor and switch between `Edit Template` and `Template Settings` controls.
2. Tap-select and swipe-select templates repeatedly; verify stable highlight and haptics.
3. Swap photo only; verify audio + trim + tweaks remain.
4. Swap audio only; verify photo + aspect + template + tweaks remain.
5. Change spin speed/transparency/background and confirm live preview updates.
6. Export and verify selected template + current tweak values are reflected in output path behavior.
7. Run `npm run lint` and targeted device smoke test on iOS simulator.

## Step 6 - Documentation Updates

After implementation, update:
- `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md` (Create editor controls subsection + acceptance criteria additions)
- `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` (Decisions Log entry for split control surfaces)
- `docs/requirements/summary.json` (if event list or phase focus changes)

## Acceptance Criteria (Must Pass)

- User can open dedicated `Edit Template` and `Template Settings` control surfaces from editor.
- Template/aspect/media controls are no longer crowded in one inline row.
- Template selection is reliable via both tap and swipe, with clear selected state.
- Template polish controls (spin/transparency/background) apply to live preview immediately.
- No regression in non-destructive media swap behavior.
- Layout retains or improves usable vertical space for preview/timeline controls.
- Lint/typecheck passes and no new navigation dead ends are introduced.
```
