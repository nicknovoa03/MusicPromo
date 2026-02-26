# Phase 0: Bootstrap

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 0
Focus: Authentication & Guest Mode

## Prerequisites

This is the first phase. The repo contains Expo boilerplate and a basic Convex setup — build on top of it, do not start from scratch.

Before writing any code, read the PRD and Agent Design Requirements docs to understand the full project context. Run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan → Implement → Verify → Refactor → Update PRD (Section 2.2).

## Step 1 — Expo Project Setup

Build on the existing Expo boilerplate. Ensure Expo Router is configured for file-based routing. Verify the project runs on both iOS and Android simulators before proceeding.

Key files:
- app/_layout.tsx — root layout (providers go here)
- app.json — Expo config
- package.json — dependencies

## Step 2 — Clerk Authentication

Integrate Clerk for auth with three sign-in options:
- Sign in with Apple (OAuth SSO)
- Sign in with Google (OAuth SSO)
- Continue as Guest (Clerk anonymous session)

Create the auth screen and auth routing:
- app/(auth)/_layout.tsx — auth group layout
- app/(auth)/sign-in.tsx — sign-in screen (light theme)
- Auth gate in app/_layout.tsx — redirect unauthenticated users to sign-in, authenticated users to tabs
- src/lib/clerk.ts — token cache using expo-secure-store

New dependencies needed:
- @clerk/clerk-expo
- expo-secure-store
- expo-web-browser (for OAuth flow)
- expo-auth-session

Environment variables (in .env):
- EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

Reference: docs/design-inspiration/sign-in/note.txt (text notes — use Meta's Edits app as visual reference)

## Step 3 — Convex Backend

Wire up Convex as the backend database with Clerk JWT integration:
- src/lib/convex.ts — Convex client instance
- convex/auth.config.ts — Clerk auth provider config
- convex/schema.ts — define initial schema (users, projects, templates tables)
- convex/users.ts — getOrCreate mutation, current query, updateProfile mutation
- Wrap the app in ConvexProviderWithClerk in app/_layout.tsx

Environment variables (in .env):
- EXPO_PUBLIC_CONVEX_URL

New dependencies needed:
- convex

## Step 4 — PostHog Analytics

Integrate PostHog for event tracking:
- Wrap the app in PostHogProvider in app/_layout.tsx
- src/lib/analytics.ts — define EventName type for all tracked events
- Wire up initial events: app_opened, sign_in_completed, guest_mode_started
- Identify users after sign-in (posthog.identify with Clerk user ID)

Environment variables (in .env):
- EXPO_PUBLIC_POSTHOG_API_KEY
- EXPO_PUBLIC_POSTHOG_HOST

New dependencies needed:
- posthog-react-native

## Step 5 — Navigation Shell

Build the bottom tab bar with 3 tabs:
- app/(tabs)/_layout.tsx — tab navigator configuration
- app/(tabs)/index.tsx — Home tab (placeholder for now, will become project history in Phase 1c)
- app/(tabs)/create.tsx — Create tab (redirects to picker screen)
- app/(tabs)/profile.tsx — Profile tab (placeholder, will be built out in Phase 2)

Light theme for the tab bar. Icons from @expo/vector-icons (Ionicons).

Create the create flow stack (empty screens for now):
- app/create/_layout.tsx — Stack navigator for the create flow
- app/create/picker.tsx — placeholder
- app/create/editor.tsx — placeholder

## Step 6 — Design Tokens

Create a shared design tokens file:
- src/constants/tokens.ts — colors (light theme, dark theme, accent), typography scales, spacing, border radius

Use the dual-theme approach: light theme for browsing (tabs, home, sign-in), dark theme for editing (create flow). Primary design reference is Meta's Edits app.

## Step 7 — Verify and Update Docs

1. Test: fresh install → sign in with Apple/Google → lands on Home tab → tabs work → sign out → sign in as guest
2. Verify Convex user record is created on first sign-in
3. Verify PostHog events fire (app_opened, sign_in_completed or guest_mode_started)
4. Verify the app runs on both iOS and Android simulators
5. Update the Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with any architectural decisions made
```
