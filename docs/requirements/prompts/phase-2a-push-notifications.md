# Phase 2a: Push Notifications

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 2
Focus: Push Notifications

## Prerequisites

Phase 1 is complete. The app can authenticate users, create/render/share promo videos, and load project history from Convex.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan -> Implement -> Verify -> Refactor -> Update PRD (Section 2.2).

## Step 1 - Add Expo Notifications Setup

Add push notification support to the Expo app config and dependencies.

Files:
- package.json - add expo-notifications dependency via `npx expo install expo-notifications`
- app.json - add expo-notifications plugin/config and platform-specific options required for push

Notes:
- Keep this feature in dev builds / EAS builds (not Expo Go).
- Ensure iOS and Android config is explicit and version controlled.

## Step 2 - Extend Convex Data Model

Add notification-related entities in Convex schema.

Files:
- convex/schema.ts
- convex/pushTokens.ts (new)
- convex/notifications.ts (new)

Schema additions:
- pushTokens table:
  - userId (id("users"))
  - expoPushToken (string)
  - platform ("ios" | "android")
  - createdAt, updatedAt (number)
  - index by user and token
- notifications table:
  - userId (id("users"))
  - type ("reminder" | "new-template" | "export-complete" | "announcement")
  - title, body (string)
  - read (boolean)
  - trigger ("automated" | "manual")
  - sentAt (number)
  - index by user and sentAt

Convex functions:
- pushTokens.upsertForCurrentUser mutation
- pushTokens.removeForCurrentUser mutation (for sign-out/device token cleanup)
- notifications.listByUser query
- notifications.markRead mutation
- notifications.create mutation (system/manual use)

All mutations must enforce auth and ownership checks.

## Step 3 - Register Device Token In App

Request notification permissions and register the Expo push token after auth.

Suggested implementation:
- Create src/lib/notifications.ts with:
  - permission request helper
  - token registration helper
  - received/tap listener registration helpers
- In app startup flow (root layout or tabs bootstrap), after auth is ready:
  - request permission once
  - get Expo push token
  - store token in Convex via upsertForCurrentUser

Behavior:
- If permission is denied, app should keep working without blocking core flows.
- If token registration fails, fail silently and log warnings for debugging.

## Step 4 - Handle Received and Tapped Notifications

Wire foreground/background handlers and analytics.

Requirements:
- Track notification_received when a push is delivered to the app
- Track notification_tapped when user taps a push
- Tapping a notification should route user to Home tab

Files:
- src/lib/analytics.ts (ensure events are available)
- app/_layout.tsx and/or app/(tabs)/_layout.tsx for listener lifecycle wiring

## Step 5 - Create Basic Send Path For Manual Testing

Implement a minimal path to generate/send notifications for dev and QA.

Options:
- Convex action or script for sending via Expo Push API
- Convex mutation to create notification records when a send is triggered

For v1, cover all four types:
- reminder
- new-template
- export-complete
- announcement

Document how to trigger each type in local QA notes or code comments.

## Step 6 - Verify and Update Docs

1. Test permission prompt appears on first launch after auth.
2. Test token is stored in Convex for authenticated/guest user.
3. Send test notifications for each type and confirm receipt.
4. Tap notification and confirm app opens/navigates to Home.
5. Verify analytics events: notification_received and notification_tapped.
6. Confirm denied-permission path does not block create/export features.
7. Update Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with push architecture decisions.
```
