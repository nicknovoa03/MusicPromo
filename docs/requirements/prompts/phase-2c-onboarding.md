# Phase 2c: Onboarding

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/ (onboarding style TBD, align with overall product aesthetic)
Current phase: Phase 2
Focus: Onboarding

## Prerequisites

Phase 1 core flow is complete. Auth, create/export/share, and project history are functional.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan -> Implement -> Verify -> Refactor -> Update PRD (Section 2.2).

## Step 1 - Define Onboarding State

Add a durable first-run completion flag tied to the current user/session.

Recommended options:
- Convex-backed user field (preferred for cross-device consistency), e.g. onboardingCompletedAt
- Local storage fallback for guest/offline edge cases

Files:
- convex/schema.ts (if adding user field)
- convex/users.ts (mutation/query updates)
- app/_layout.tsx or app/(tabs)/_layout.tsx (routing gate)

Rules:
- First-time user sees onboarding after successful auth/guest entry
- Returning user skips onboarding and lands in main app

## Step 2 - Create Onboarding Screen(s)

Implement a simple 1-3 screen walkthrough.

Suggested files:
- app/onboarding.tsx (single screen with paged content), or
- app/onboarding/_layout.tsx + app/onboarding/index.tsx + app/onboarding/step-2.tsx (multi-route flow)

Content requirements:
- Explain core value: photo + audio -> promo video in seconds
- Explain basic flow: pick media -> trim -> export -> share
- End with clear CTA: "Start Creating"

UX requirements:
- Allow skip
- Maintain smooth transitions
- Keep copy concise and creator-focused

## Step 3 - Add Routing Gate

Gate entry into tabs/create until onboarding is completed for first-time users.

Requirements:
- After auth resolves, evaluate onboarding completion
- If incomplete, route to onboarding
- When completed or skipped, persist state and route to Home or Create

Avoid loops:
- Handle async loading states explicitly
- Ensure router.replace logic does not repeatedly fire

## Step 4 - Completion Handling

On final CTA or skip:
- Persist onboarding completion state
- Track onboarding_completed analytics event
- Route to app destination (Home tab by default)

Files:
- app/onboarding*.tsx
- src/lib/analytics.ts
- convex/users.ts (if using server-backed completion flag)

## Step 5 - Edge Cases

Cover expected edge cases:
- Guest user onboarding path
- Offline mode during onboarding completion write
- App close/reopen mid-onboarding
- Auth state changes during onboarding

Behavior:
- Never block app usage due to onboarding write failure
- If write fails, retry gracefully or fallback to local completion state

## Step 6 - Verify and Update Docs

1. Test first install -> sign in/guest -> onboarding appears -> complete -> lands in app.
2. Test relaunch after completion -> onboarding does not appear again.
3. Test skip path -> lands in app and does not reappear next launch.
4. Test guest and authenticated users both follow expected onboarding behavior.
5. Verify onboarding_completed event fires once per completed onboarding.
6. Update Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with onboarding state/storage decisions.
```
