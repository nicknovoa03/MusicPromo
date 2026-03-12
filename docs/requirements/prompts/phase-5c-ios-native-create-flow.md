# Phase 5c: iOS Native Create Flow Surfaces

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: Phase 5c
Focus: SwiftUI-first native create flow surfaces (Picker, Editor, Template Controls, Rendering, Share, Shell)

## Prerequisites

- Phase 5a foundation gating is merged.
- Phase 5b profile migration is merged (or independently validated).
- Existing create/export/share reliability baseline is green.

## Lessons Applied From Phase 5a

- Prefer static imports for `@expo/ui/swift-ui` in migrated screens. Avoid runtime `require`-based loading paths.
- Before rendering native surfaces, validate runtime shape for required components on that screen and fallback immediately if unavailable.
- Avoid attaching native menu/gesture surfaces to competing RN gesture chains. Keep interaction ownership clear per path.
- Keep fallback controls visible and parity-tested until native path is verified on-device for each create surface.

## Lessons Applied From Phase 5b

- Keep native adoption scoped first (surface-level/modal-level) before considering full-screen rewrites so existing brand/theme remains intact.
- Gate native surfaces with both contract checks (flag + platform/version/capability) and runtime component-shape checks before rendering.
- Disable or bypass competing RN gesture handlers when native surfaces are active on the same interaction path.
- Preserve deterministic write parity: local mode writes local state, signed-in mode writes local cache + Convex using existing validation/sanitization paths.
- Block preference writes while profile/source state is loading or while save operations are already in-flight.
- Treat SwiftUI `TextField` as uncontrolled and reseed with stable keys when source state refreshes.
- Keep fallback UI deterministic and untouched (`iOS + flag OFF`, unsupported iOS runtime, Android).
- Run QA in both native-enabled and fallback paths for every migrated surface.

## Goal

Improve native iOS feel across Create flow surfaces without changing core rendering, media, or export correctness contracts.

## Direction Update (2026-03-07)

- Use SwiftUI-native components for iOS create flow surfaces wherever feasible while preserving the existing app theme, flow, and customization depth.
- Keep React Native as the source-of-truth for state, validation, analytics, routing, and persistence contracts; use SwiftUI as the interaction/presentation shell.
- Prefer native gesture ownership for migrated surfaces (sheet drag-to-dismiss, native segmented/menu picker feel, native button/selection motion).
- Avoid iOS `pageSheet` chrome artifacts when they conflict with the dark branded surface treatment; prefer full-screen + SwiftUI/RN-controlled shells when needed.
- Migrate surface-by-surface (not architecture rewrite): maintain strict parity and deterministic fallback paths throughout.

## Interaction/Architecture Policy

- SwiftUI-first presentation for iOS:
  - `Host`, `BottomSheet`, `Form`, `Section`, `Picker`, `Switch`, `Button`, `Progress` where appropriate.
- RN logic contracts remain unchanged:
  - media selection/validation
  - template tweak serialization
  - trim/export/share correctness
  - analytics events and names
  - navigation outcomes
- No dual-ownership gesture chains on the same path:
  - when native SwiftUI sheet/gesture is active, disable competing RN pan/drag handlers on that surface.

## Scope

In scope:
- iOS-native presentation + gesture migration for picker/editor/rendering/share
- iOS-native Template Controls surface migration (`src/components/create/TemplateCustomizeModal.tsx`)
- Optional native progress visuals in rendering
- iOS header/sheet/shell polish where it improves clarity

Out of scope:
- Rewriting create architecture
- Changing render engine logic
- Introducing destructive state changes in media/template flows

## Step 1 - Create Picker View (`app/create/picker.tsx`)

Requirements:
- Preserve current audio-first + photo-second structure.
- Add only light native iOS presentation polish.
- Preserve:
  - add/cancel flow
  - media validation
  - artwork autofill behavior
  - existing route param handoff contract

Fallback policy:
- Existing RN picker path remains fallback.

## Step 2 - Create Editor View (`app/create/editor.tsx`)

Requirements:
- Keep existing editor architecture and surface flow.
- Optionally replace bounded-option controls with more native-feeling iOS controls where safe.
- Preserve:
  - non-destructive media swaps
  - template tweak serialization
  - trim behavior
  - export trigger behavior
  - analytics events

Fallback policy:
- Existing RN editor controls remain source-of-truth fallback.

## Step 2b - Template Controls Surface (`src/components/create/TemplateCustomizeModal.tsx`)

Requirements:
- Migrate Template Controls surface to SwiftUI-first presentation/gestures on supported iOS path.
- Preserve all existing controls and tweak semantics:
  - stage background color/photo
  - background blur
  - spin speed
  - record transparency
  - spin start angle/direction
- Preserve existing apply/cancel behavior and analytics parity.
- Keep branded dark theme and avoid white seam/chrome artifacts at top corners/edges.
- Native drag-to-dismiss should work reliably (top handle/header zone minimum), without interfering with scroll controls.

Fallback policy:
- Existing RN Template Controls surface remains deterministic fallback/default path.

## Step 3 - Rendering View (`app/create/rendering.tsx`)

Requirements:
- Add optional native iOS progress visual while retaining existing percentage text.
- Keep render/export logic unchanged.
- Ensure progress visualization remains lifecycle-consistent.

Fallback policy:
- Existing rendering UI remains guaranteed fallback.

## Step 4 - Share View (`app/create/share.tsx`)

Requirements:
- Optional native visual polish only.
- Keep all share/save actions and analytics unchanged.
- Keep current navigation outcomes unchanged.

Fallback policy:
- Existing share UI remains fallback/default path.

## Step 5 - Navigation/Shell Polish (`app/(tabs)/_layout.tsx`, `app/create/_layout.tsx`)

Requirements:
- Keep current native tabs baseline.
- Add selective liquid-glass/header polish where it improves clarity.
- Keep dark create surfaces legible and consistent.
- Avoid visual churn without interaction value.

## Step 6 - QA and Acceptance

QA script:
1. Picker media selection/change behaviors unchanged.
2. Editor non-destructive swapping and template tweaks unchanged.
3. Template Controls:
   - all tweak controls produce same values as fallback path
   - swipe-down dismiss works consistently
   - no white seam/border artifact on top corners in dark mode
4. Rendering progress remains accurate; export success path unchanged.
5. Share save/share actions unchanged.
6. iOS + flag OFF and Android paths remain unchanged.
7. Run `npm run lint:all`.

Acceptance criteria:
- Create flow feels iOS-native on supported path (components + gestures).
- Template Controls uses native-feeling sheet interactions without visual seam artifacts.
- No regressions to create/export/share core outcomes.
- Android and fallback paths remain stable.
```
