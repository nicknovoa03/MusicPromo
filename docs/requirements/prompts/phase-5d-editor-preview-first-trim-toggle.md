# Phase 5d: Create Editor Preview-First Trim Toggle

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: Phase 5d
Focus: Create Editor refactor for preview-first layout + toggleable Trim Audio panel

## Prerequisites

- Phase 5c create-flow surface work is merged (or validated locally).
- Current editor behavior is stable for:
  - media swap flows
  - template settings modal
  - template info toggle
  - trim correctness + export correctness
- Existing analytics event names remain canonical unless explicitly expanded.

Before writing code:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` (Section 3.1).
- Keep this refactor scoped to editor layout/interaction behavior, not rendering logic.

## Goal

Refactor the editor so preview is the primary visual focus by default, while Trim Audio becomes an on-demand control surface that slides in and out smoothly without breaking existing trim/export behavior.

## Good Model (Target UX Contract)

1. Default state prioritizes preview:
   - Preview occupies most available editor space.
   - Trim UI is hidden on first load.
2. Preview controls remain available:
   - Keep existing `Edit Template` and template/info actions.
3. Add a `Trim Audio` control in preview actions:
   - User can enter trim mode from the same control cluster as other preview actions.
4. Open trim mode behavior:
   - Reveal trim UI below preview using smooth transition.
   - Layout should visually resemble current "preview on top, trimmer on bottom" arrangement.
5. Close trim mode behavior:
   - Tapping the same `Trim Audio` control again collapses trim mode.
   - Do not add a `Done` button for trim collapse.

## Scope

In scope:
- Editor layout/state refactor in `app/create/editor.tsx`
- Toggle state for trim panel visibility
- Smooth show/hide transition for trimmer section
- Minor button styling/labels for trim toggle affordance
- Accessibility labels/states for new trim toggle behavior

Out of scope:
- Rewriting `AudioTrimmer` logic semantics
- Changing trim math or export pipeline
- Changing template tweak data model
- New modal/sheet architecture for trimming

## Step 1 - Add Trim Visibility State + Intentional Toggle Entry Point

Files:
- `app/create/editor.tsx`

Requirements:
- Add explicit state for trim panel visibility (default hidden).
- Add `Trim Audio` action in preview action row.
- Keep existing controls (`settings`, `info`, `Edit Template`) intact.
- Ensure action labels match behavior and remain clear in dark UI.

## Step 2 - Transition the Trimmer In/Out Smoothly

Files:
- `app/create/editor.tsx`

Requirements:
- Animate trimmer panel show/hide using RN-native animation primitives already used in project patterns.
- Transition should feel deliberate:
  - smooth vertical reveal/collapse
  - soft opacity easing
  - no abrupt layout jump
- Keep animation performant on iOS and Android fallback path.

## Step 3 - Preserve Existing Trim, Playback, and Export Contracts

Files:
- `app/create/editor.tsx`
- `src/components/create/AudioTrimmer.tsx` (read-only unless required)

Requirements:
- Preserve current trim range behavior, min/max clamping, and preview playback linkage.
- Preserve export behavior and route param handoff (`trimStart`, `trimEnd`, etc.).
- Opening/closing trim panel must not reset trim values or playback state unexpectedly.

## Step 4 - Layout Tuning for Preview-First Hierarchy

Files:
- `app/create/editor.tsx`

Requirements:
- Default (trim hidden): maximize usable vertical space for preview.
- Trim visible: maintain clear two-part hierarchy (preview top, trimmer bottom) with enough room for trimmer interaction.
- Avoid overlap regressions with header, missing-file notice, native control host, and floating badges/buttons.

## Step 5 - Analytics and Accessibility

Files:
- `app/create/editor.tsx`
- `src/lib/analytics.ts` (only if adding event constants is required)

Requirements:
- Keep existing analytics events unchanged.
- If new telemetry is added, use additive events only and preserve current funnels.
- Add/verify accessibility metadata:
  - `Trim Audio` control has clear label
  - selected/expanded state reflects whether trim panel is visible
- No `Done` button is introduced for trim panel dismissal; collapse is controlled by tapping `Trim Audio` again.

## Step 6 - QA and Acceptance

QA script:
1. Open editor and confirm trim panel is hidden by default.
2. Tap `Trim Audio`; verify smooth reveal with trimmer below preview.
3. Adjust trim values; collapse and re-open trim; verify values persist.
4. Tap `Trim Audio` again; verify smooth collapse (no `Done` button path).
5. Verify playback toggle and timeline progress still behave correctly while trim is visible.
6. Verify `Edit Template`, template settings, template info toggle, and aspect ratio actions still function.
7. Export and confirm trimmed output is still correct.
8. Run `npm run lint:all`.

Acceptance criteria:
- Preview-first editor hierarchy is visually clear in default state.
- Trim panel is on-demand and transitions smoothly in/out.
- Trim collapse is tap-to-toggle only via `Trim Audio` control.
- No `Done` button exists for trim panel dismissal.
- No regressions in trim correctness, export correctness, or existing editor control flows.
```
