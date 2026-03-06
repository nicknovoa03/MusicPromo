# Phase 5b: iOS Native Profile / Settings

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: Phase 5b
Focus: Profile/settings native grouped controls with strict fallback parity

## Prerequisites

- Phase 5a foundation gating is merged (flag + capability checks).
- Home fallback matrix already verified.

## Goal

Upgrade Profile/Settings to a more iOS-native settings experience while preserving all existing account/data behaviors.

## Scope

In scope:
- Grouped iOS-native settings structure for supported iOS path
- Native-feeling controls for bounded preferences
- Preservation of all existing profile/account flows

Out of scope:
- Home and Create flow changes
- New backend profile schema changes

## Step 1 - iOS Native Settings Surface

Files:
- `app/(tabs)/profile.tsx`

Requirements:
- Introduce iOS grouped settings presentation (Form/Section-like layout) for supported iOS path.
- Keep the current information architecture:
  - identity/profile block
  - preferences
  - account actions

## Step 2 - Preference Controls Migration

Files:
- `app/(tabs)/profile.tsx`

Controls to migrate first:
- default aspect ratio
- default video length
- profile links/preferences where current data model supports it

Requirements:
- Use native-feeling controls where practical.
- Preserve existing write paths (Convex for signed-in users, local profile for guest/local mode).
- Preserve current validation/sanitization behavior.

## Step 3 - Account Safety Flows (No Behavior Regressions)

Files:
- `app/(tabs)/profile.tsx`

Requirements:
- Sign-out behavior unchanged.
- Soft-delete account behavior unchanged.
- Error handling and loading states remain clear and recoverable.

Fallback policy:
- Existing RN Profile UI remains the deterministic fallback when native path is disabled/unavailable.

## Step 4 - QA and Acceptance

QA script:
1. Signed-in profile load/edit/save works on iOS native path.
2. Guest/local profile load/edit/save works on iOS native path.
3. Sign-out flow unchanged.
4. Delete account flow unchanged.
5. iOS + flag OFF path matches current behavior.
6. Android behavior unchanged.
7. Run `npm run lint:all`.

Acceptance criteria:
- Profile screen feels iOS-native on supported path.
- No regressions to auth/account or preference persistence.
- Android and fallback paths remain stable.
```

