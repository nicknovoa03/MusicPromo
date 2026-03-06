# Phase 5: iOS Native Surface + Liquid Glass Adoption

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Reference materials:
- https://github.com/betomoedano/expo-ui-playground
- https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui
Current phase: Phase 5
Focus: Incrementally adopt iOS-native Expo UI / SwiftUI components and liquid-glass surfaces without regressing Android or existing create/export reliability.

## Prerequisites

- Phase 4 MVP lock/release-readiness work is stable in production builds.
- Existing fallback UI paths remain intact for all critical flows:
  - `app/(tabs)/index.tsx`
  - `app/(tabs)/profile.tsx`
  - `app/create/editor.tsx`
  - `app/create/rendering.tsx`
- Team agrees this phase is iOS-first and additive, not a rewrite.

Before coding:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` (Section 3.1).
- Keep this phase scoped to UX fidelity and native feel.
- Do not block Android parity or release cadence.

## Goal

Make MusicPromo feel more iOS-native by introducing SwiftUI-backed Expo UI components and liquid-glass affordances on iOS, while preserving existing RN components as robust fallbacks for Android and unsupported iOS paths.

## Scope

In scope:
- iOS-only adoption of high-impact native UI primitives (menus, forms, pickers, empty states, progress visuals, glass accents)
- Feature-flagged rollout with deterministic fallback behavior
- Screen-by-screen migration plan for Home, Profile, and Create surfaces

Out of scope:
- Replacing all existing React Native components
- Breaking Android visual/behavioral consistency
- Moving to cloud rendering or changing core media/export architecture

## Execution Tickets (Recommended Order)

Run Phase 5 as three shippable slices:
1. `docs/requirements/prompts/phase-5a-ios-native-home-projects.md`
2. `docs/requirements/prompts/phase-5b-ios-native-profile-settings.md`
3. `docs/requirements/prompts/phase-5c-ios-native-create-flow.md`

Each ticket must pass its own fallback checks before moving to the next.

## Step 1 - Foundation: Flags, Availability, and Safety Rails

Files:
- `app/_layout.tsx`
- `src/lib/utils.ts` (or dedicated feature-flag helper file)
- `package.json`

Requirements:
- Introduce a feature flag for iOS-native surfaces, e.g. `EXPO_PUBLIC_IOS_NATIVE_UI_PHASE5=1`.
- Gate all new surfaces behind:
  1) platform check (`Platform.OS === "ios"`)
  2) flag check
  3) runtime availability checks for native modules/components.
- Keep existing RN implementation as default fallback whenever checks fail.
- Document required runtime expectations (Expo Go vs dev client/build as applicable to selected dependencies).

## Step 2 - View-by-View Implementation Plan

### View A - Home / Projects (`app/(tabs)/index.tsx`)

Primary migration:
- Replace iOS project actions modal with iOS-native context menu interaction where available.
- Upgrade iOS empty state to native empty-state presentation (equivalent to `ContentUnavailableView`).

Behavioral constraints:
- Keep rename/duplicate/delete actions exactly aligned with current behavior.
- Keep destructive semantics and confirmation flow for delete.
- Preserve analytics: `project_actions_opened`, `project_delete_started`, `project_deleted`.

Fallback policy:
- Existing custom `Modal` actions sheet remains the fallback contract and must remain functional.
- Multi-select bulk-delete stays intact and parity-tested.

### View B - Profile / Settings (`app/(tabs)/profile.tsx`)

Primary migration:
- Introduce sectioned iOS-native settings structure (Form/Section grouped feel).
- Move preference editing to native-feeling controls where support is reliable.

Controls to target first:
- default aspect ratio
- default video length
- profile links/preferences where applicable

Behavioral constraints:
- Preserve all existing Convex/local profile mutation contracts.
- Keep sign-out and account deletion flows unchanged.

Fallback policy:
- Keep current RN profile layout path as fallback for Android and unsupported iOS capability paths.

### View C - Create Picker (`app/create/picker.tsx`)

Primary migration:
- Keep current audio-first + photo-second information architecture.
- Add only light iOS-native polish (presentation/interaction), not a structural rewrite.

Behavioral constraints:
- Preserve current add/cancel affordances and media selection validation.
- Preserve artwork autofill behavior and no-destructive-reset guarantees.

Fallback policy:
- Existing RN picker surface remains default fallback behavior.

### View D - Create Editor (`app/create/editor.tsx`)

Primary migration:
- Keep editor architecture and control surfaces unchanged.
- Add iOS-native controls only for bounded-option selections where it clearly improves native feel.

Behavioral constraints:
- No regression to non-destructive media swaps.
- No regression to template tweak serialization/parity flow.
- No regression to trim behavior, export launch behavior, or analytics.

Fallback policy:
- Existing RN controls stay available and must remain source-of-truth fallback.

### View E - Rendering (`app/create/rendering.tsx`)

Primary migration:
- Add optional iOS-native progress visual (gauge/progress-style) while retaining percentage text.

Behavioral constraints:
- Rendering/export engine logic remains unchanged.
- Progress display must stay consistent with actual render lifecycle.

Fallback policy:
- Existing rendering progress UI remains the guaranteed fallback.

### View F - Share (`app/create/share.tsx`)

Primary migration:
- Optional iOS-native presentation polish only (button/menu/chrome feel), no flow changes required in this phase.

Behavioral constraints:
- Keep all share/save handlers and analytics untouched.
- Keep current navigation out of share screen untouched.

Fallback policy:
- Existing share surface remains fallback/default for non-iOS native path.

### View G - Navigation + Shell (`app/(tabs)/_layout.tsx`, `app/create/_layout.tsx`)

Primary migration:
- Keep native tabs baseline and add liquid-glass accents selectively where clarity improves.
- Add iOS-native header behavior where appropriate (large title, native menu/button placement, sheet/modal presentation fit).

Behavioral constraints:
- Avoid visual conflict with dark create surfaces.
- Keep legibility and contrast non-negotiable.

Fallback policy:
- Existing tab and stack behavior remains fallback and should not be removed.

## Step 3 - Fallback Matrix + QA Contract (Required)

Validation matrix:
1. iOS + flag ON + native runtime available → native components render and behave correctly.
2. iOS + flag OFF → existing RN fallback renders unchanged.
3. iOS + flag ON + unavailable native capability → graceful fallback per surface.
4. Android (any flag state) → existing RN implementation only.

QA script:
1. Home: open card actions, execute delete flow, verify analytics and destructive confirmations.
2. Home: empty projects state appears correctly on iOS and fallback on Android.
3. Profile: edit preferences and verify persistence (guest + signed-in modes).
4. Picker: select/change audio and photo, verify existing guardrails and data handoff.
5. Editor: adjust template/media settings; ensure non-destructive swaps still hold.
6. Rendering: verify progress visuals (native + fallback) stay in sync with export lifecycle.
7. Share: verify save/share actions and completion navigation remain unchanged.
8. Run `npm run lint:all` and iOS+Android smoke tests.

## Step 4 - Analytics and Rollout

Files:
- `src/lib/analytics.ts`
- impacted screens from Step 2 view migrations

Requirements:
- Preserve existing funnel events.
- Add only minimal new events for migration observability, e.g.:
  - `ios_native_ui_enabled`
  - `ios_native_context_menu_used`
  - `ios_native_settings_surface_viewed`
- Roll out behind feature flag and keep ability to disable instantly via config.

## Step 5 - Documentation Updates

After implementation, update:
- `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`
  - phase status and any acceptance criteria changes
- `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md`
  - decisions log entries for chosen native components + fallback policy
- `docs/requirements/summary.json`
  - phase/epic alignment if needed

## Acceptance Criteria (Must Pass)

- iOS users get clearly more native interaction patterns on Home + Profile + selected Create surfaces.
- Android users see no regressions and continue using existing stable RN UI.
- All native additions are feature-flagged and have deterministic fallback.
- No regressions to create/export/share critical path.
- Typecheck/lint passes and smoke tests pass on iOS and Android.
```
