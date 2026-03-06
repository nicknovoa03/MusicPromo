# Phase 5a: iOS Native Home / Projects

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Reference materials:
- https://github.com/betomoedano/expo-ui-playground
- https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui
Current phase: Phase 5a
Focus: Foundation gating + Home/Projects native interaction upgrade

## Goal

Ship the first production-safe iOS-native slice by upgrading Home/Projects interactions while preserving deterministic fallback behavior.

## Scope

In scope:
- Phase 5 foundation feature flag + availability checks
- Home card actions migration to iOS-native context menu where available
- iOS-native empty-state treatment for Home

Out of scope:
- Profile, Create, Rendering, Share migrations (handled by later slices)
- Removing the existing RN modal/actions fallback

## Step 1 - Foundation Flags and Capability Gating

Files:
- `app/_layout.tsx`
- `src/lib/utils.ts` (or dedicated flag helper)
- `package.json`

Requirements:
- Add `EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5=1` flag contract.
- Add reusable helper that gates by:
  1) iOS platform
  2) phase flag enabled
  3) runtime capability available
- Keep fallback as default when any check fails.

## Step 2 - Home Actions: Modal to Native Context Menu (iOS Path)

Files:
- `app/(tabs)/index.tsx`

Requirements:
- Introduce iOS-native context menu for project actions where available.
- Preserve exact action set and behavior:
  - Rename (placeholder allowed)
  - Duplicate (placeholder allowed)
  - Delete (destructive + confirmation)
- Preserve analytics:
  - `project_actions_opened`
  - `project_delete_started`
  - `project_deleted`

Fallback policy:
- Existing `Modal` actions sheet remains active fallback.

## Step 3 - Home Empty State: Native Style on iOS

Files:
- `app/(tabs)/index.tsx`

Requirements:
- Use iOS-native empty-state style (equivalent to `ContentUnavailableView`) when native path is enabled.
- Preserve current RN empty-state fallback for all other cases.
- Do not regress pull-to-refresh or loading overlay behavior.

## Step 4 - QA and Acceptance

QA script:
1. iOS + flag ON: long-press/actions open native context menu; delete path works.
2. iOS + flag OFF: existing modal actions path remains unchanged.
3. Android: existing modal/actions path unchanged.
4. Empty projects state renders correctly on iOS native path and fallback path.
5. Multi-select bulk delete still works as before.
6. Run `npm run lint:all`.

Acceptance criteria:
- Home has visibly more iOS-native interactions on supported iOS runtime.
- No regressions on Android or fallback paths.
- Existing analytics semantics are preserved.
```

