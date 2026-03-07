# Phase 5c: iOS Native Create Flow Surfaces

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: Phase 5c
Focus: Create flow native surface polish (Picker, Editor, Rendering, Share, Shell)

## Prerequisites

- Phase 5a foundation gating is merged.
- Phase 5b profile migration is merged (or independently validated).
- Existing create/export/share reliability baseline is green.

## Lessons Applied From Phase 5a

- Prefer static imports for `@expo/ui/swift-ui` in migrated screens. Avoid runtime `require`-based loading paths.
- Before rendering native surfaces, validate runtime shape for required components on that screen and fallback immediately if unavailable.
- Avoid attaching native menu/gesture surfaces to competing RN gesture chains. Keep interaction ownership clear per path.
- Keep fallback controls visible and parity-tested until native path is verified on-device for each create surface.

## Goal

Improve native iOS feel across Create flow surfaces without changing core rendering, media, or export correctness contracts.

## Scope

In scope:
- iOS-native presentation polish for picker/editor/rendering/share
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
3. Rendering progress remains accurate; export success path unchanged.
4. Share save/share actions unchanged.
5. iOS + flag OFF and Android paths remain unchanged.
6. Run `npm run lint:all`.

Acceptance criteria:
- Create flow feels more iOS-native on supported path.
- No regressions to create/export/share core outcomes.
- Android and fallback paths remain stable.
```
