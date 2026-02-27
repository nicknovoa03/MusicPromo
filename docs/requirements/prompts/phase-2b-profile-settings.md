# Phase 2b: Profile and Settings

```txt
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/profile-settings/
Current phase: Phase 2
Focus: Profile and Settings

## Prerequisites

Phase 1 is complete and Phase 2a (push foundations) is either complete or in progress. The current profile screen exists but is partial.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan -> Implement -> Verify -> Refactor -> Update PRD (Section 2.2).

## Step 1 - Finalize Profile Data Contract

Review and finalize user profile fields required for v1 settings.

Files:
- convex/schema.ts
- convex/users.ts

Required profile capabilities:
- read current profile (name, email, avatar)
- update preferences:
  - defaultAspectRatio ("9:16" | "1:1")
  - defaultVideoLength (number)
- support account deletion as soft-delete (do not hard-delete records in v1)

If schema changes are needed for soft-delete, add fields such as:
- deletedAt (optional number)
- isDeleted (optional boolean)

Ensure queries/mutations respect soft-deleted users (deny writes or route to signed-out flow).

## Step 2 - Build Settings Interactions

Upgrade the existing profile tab from display-only to interactive settings.

File:
- app/(tabs)/profile.tsx

UI requirements (dark theme, Spotify-inspired):
- Profile card with avatar, name, email
- Interactive default aspect ratio setting (9:16 or 1:1)
- Interactive default video length setting (for example 15s/30s/60s presets)
- Sign out action with confirmation
- Delete account action with destructive confirmation and clear warning text

Behavior:
- Save preference changes to Convex immediately (or with explicit Save CTA)
- Show loading/error feedback for failed updates
- Keep guest state clear in UI

## Step 3 - Connect Preferences To Create Flow Defaults

Use stored preferences as defaults in create/editor flows.

Files:
- app/create/picker.tsx
- app/create/editor.tsx
- app/(tabs)/create.tsx (if needed for prefill entry behavior)

Requirements:
- New create sessions should initialize aspect ratio from user preference
- New create sessions should initialize default trim/video length from user preference
- Existing project edits should still prioritize saved project values over profile defaults

## Step 4 - Implement Account Deletion (Soft-Delete)

Create a safe deletion flow that satisfies v1 requirements.

Files:
- convex/users.ts (new delete/deactivate mutation)
- app/(tabs)/profile.tsx

Flow:
1. User taps Delete Account
2. Confirmation modal with irreversible warning
3. Execute soft-delete mutation in Convex
4. Sign user out from Clerk
5. Route to sign-in screen

Constraints:
- Do not hard-delete project history in v1
- Keep behavior reversible/admin-recoverable if needed

## Step 5 - Analytics

Track key profile/settings actions with PostHog.

Add events if needed:
- profile_preference_updated
- account_delete_started
- account_deleted
- sign_out_tapped

Keep the existing event naming style consistent in src/lib/analytics.ts.

## Step 6 - Verify and Update Docs

1. Test profile loads correctly for signed-in and guest users.
2. Test aspect ratio and default length settings persist and re-open correctly.
3. Test create flow uses profile defaults for new projects.
4. Test sign out returns to auth screen and clears app state correctly.
5. Test account deletion soft-deletes user and signs out cleanly.
6. Verify analytics events for settings changes and account actions.
7. Update Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with profile/account-management decisions.
```
