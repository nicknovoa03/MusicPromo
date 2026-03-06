# Agent Design Requirements — MusicPromo

## Doc Metadata

- Project / repo: MusicPromo (`/home/nick/MusicPromo`)
- Product name: MusicPromo
- Owners: Nick
- Date: 2026-02-20
- Version: 1.1 (phase mapping updated through Phase 5)
- Links: PRD at `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`

## 1) Guideline (Shared AI-Human Understanding)

### 1.1 Product Summary

- **One-liner:** A dead-simple mobile tool that turns a photo and audio clip into a short promo video for social media.
- **Target users:** Indie musicians and creators who self-promote on Instagram, TikTok, etc.
- **Primary value:** Eliminates the hour-long CapCut/Photoshop workflow — two inputs, one output, done.
- **Definition of v1 "done":** A user can sign in (or go guest), pick a photo + audio, trim audio, preview a spinning CD video, export as MP4, and save to camera roll or share to Instagram/TikTok. Project history is saved. Push notifications work.
- **Non-goals:** Not a video editor, not a social network, not a distribution platform, no SoundCloud integration, no multi-user/label features, no monetization.

### 1.2 Current State

- **What exists today:** Expo project boilerplate with basic Convex setup. `App.js` exists.
- **Known gaps:** No auth, no create flow, no video rendering, no navigation, no analytics.
- **Known tech debt:** None (greenfield).

### 1.3 Constraints and Invariants

- **Platforms:** iOS + Android via React Native + Expo (EAS Build)
- **Timeline:** As fast as possible (POC — potentially a day of focused work)
- **Tech constraints:**
  - Must use: React Native, Expo, Clerk, Convex, PostHog
  - Must not use: Server-side video rendering (on-device only for v1)
  - Video rendering: FFmpeg-kit for React Native or equivalent Expo-compatible library
- **Data/privacy constraints:** Email only via Clerk. Files stay on-device. Minimal PII.
- **Invariants (non-negotiables):**
  - Auth (Clerk) required for any Convex write — guest mode uses Clerk anonymous sessions
  - On-device rendering only — no cloud processing
  - Two inputs (photo + audio), one output (MP4 video) — core simplicity must be preserved
  - Non-destructive editing — swapping photo doesn't clear audio, and vice versa
  - Export must complete in under 60 seconds
  - App must not crash

### 1.4 System Map

- **Key entities:** User Profile, Project, Template, Push Token, Notification
- **Navigation model:** Bottom tab bar, 3 tabs: Home, Create, Profile. Light theme for browsing, dark theme for editing (Edits-inspired).
- **Critical flows:**
  1. First-time user → sign in / guest → onboarding → create first video → export → share
  2. Returning user → open project → change settings → re-export → share
  3. Push notification → tap → app opens to home
- **Integrations:**
  - Auth: Clerk (React Native SDK)
  - Database: Convex (React Native SDK)
  - Analytics: PostHog (React Native SDK)
  - Notifications: Expo Push Notifications (expo-notifications)
  - Sharing: Native share intents (expo-sharing / React Native Share)
  - Media: Expo ImagePicker, Expo DocumentPicker, expo-av / expo-video
  - Video rendering: FFmpeg-kit for React Native (or equivalent)

### 1.5 Decisions Log

- 2026-02-20: **Mobile app (not web)** → Users are creators on-the-go, mobile-first aligns with social media posting workflow → Web app rejected for v1
- 2026-02-20: **React Native + Expo** → Cross-platform, fast iteration, EAS handles builds → Native iOS/Android rejected (too slow for POC)
- 2026-02-20: **Clerk for auth** → Low-friction sign-in + guest mode support → Firebase Auth rejected
- 2026-02-20: **Convex for backend** → Already has boilerplate in repo, real-time, good React Native SDK → Supabase/Firebase rejected
- 2026-02-20: **On-device video rendering** → No server costs, works offline for rendering, simpler architecture → Cloud rendering rejected (adds infra complexity + cost)
- 2026-02-20: **Files on-device only** → Simplest approach, no storage costs, files are already local → Cloud storage rejected for v1 (phone switch = files lost, acceptable for POC)
- 2026-02-20: **Native share intents** → Standard mobile pattern, Instagram/TikTok handle their own UI → Direct API posting rejected (complex, TOS issues)
- 2026-02-20: **SoundCloud deferred** → Adds API integration, audio extraction pipeline, potential TOS issues → Kept for Phase 2
- 2026-02-20: **Guest mode** → Reduces friction, user can try before committing → Auth-required rejected for first use
- 2026-02-20: **Soft-delete for account deletion** → Satisfies Apple requirement while retaining backend data → Full purge may be needed (verify Apple's exact requirements)
- 2026-02-20: **Meta's Edits app as primary design reference** → Clean, professional, creative tool aesthetic → Other styles rejected (too playful, too corporate)
- 2026-02-20: **Dual-theme (light browse / dark edit)** → Matches Edits pattern, creates clear mode distinction → Single theme rejected (less visual clarity between modes)
- 2026-02-20: **Bottom tab bar with 3 tabs (Home, Create, Profile)** → Simple, standard mobile pattern → Hamburger menu rejected (less discoverable)
- 2026-02-20: **2-screen create flow (Picker → Editor)** → Separates media selection from editing, cleaner UX → Single screen rejected (too cramped)
- 2026-02-20: **Spotify-style profile/settings** → Clean list-based settings, prominent avatar → Custom design rejected (unnecessary for POC)
- 2026-02-25: **ffmpeg-kit-react-native + @config-plugins v11 for video rendering** → Single FFmpeg command handles spinning CD rotation, audio trimming, and MP4 encoding. Original ffmpeg-kit was retired/archived Jan-Apr 2025 but the Expo config plugin v11 (June 2025) bundles working binaries for SDK 53+. Alternatives evaluated and rejected: react-native-skia-video (beta, no audio support), expo-image-sequence-encoder (no audio muxing), @sheehanmunim/react-native-ffmpeg (wraps same retired lib, less transparent). If ffmpeg-kit fails at runtime, fallback is expo-image-sequence-encoder for frames + native audio mux module.
- 2026-02-25: **No expo-task-manager for background rendering** → FFmpeg-kit runs on a native thread that may survive JS backgrounding. expo-task-manager is designed for periodic short tasks (location, fetch), not long-running processes. Background rendering is best-effort only because iOS/Android can still terminate backgrounded apps under resource or policy constraints, so users should keep the app foregrounded for long renders.
- 2026-02-25: **expo-sharing for Instagram/TikTok share** → Uses the native share sheet which routes to the correct app. Direct API posting rejected (TOS complexity, requires app review from platforms).
- 2026-02-26: **Project History uses a 2-column FlatList with reactive `listByUser` + pull-to-refresh** → Meets v1 UX quickly while keeping data fresh. Cursor pagination is intentionally deferred with a TODO for when list size grows.
- 2026-02-26: **Re-export updates existing project records instead of creating duplicates** → Added `projects.update` mutation for ownership-checked patching of media/settings/export metadata on re-export.
- 2026-02-26: **Editor validates local file URIs before export** → Uses `expo-file-system/legacy` `getInfoAsync` to detect deleted/moved media and shows a non-destructive "Files not found" path to swap missing media.
- 2026-02-26: **Push registration runs post-auth in tabs bootstrap and degrades gracefully** → App requests notification permission once after auth, registers Expo token in Convex (`pushTokens.upsertForCurrentUser`), and continues core create/export flows when permission or token registration fails.
- 2026-02-26: **Push delivery uses Expo Push API via Convex action with persisted notification records** → Added `pushNotifications.sendTestPush` for QA and `notifications.createInternal` for durable per-user notification records (`reminder`, `new-template`, `export-complete`, `announcement`) even when delivery fails.
- 2026-02-26: **Profile preferences save immediately with constrained presets** → `defaultAspectRatio` and `defaultVideoLength` are updated from Profile via one-tap controls (9:16/1:1 and 15s/30s/60s) and reused as defaults for new create sessions.
- 2026-02-26: **Account deletion is soft-delete plus forced sign-out** → Added `users.isDeleted`/`users.deletedAt` and `users.softDeleteCurrent`; deleted users are treated as inactive for queries/mutations and app bootstrap routes them back to auth.
- 2026-02-27: **Onboarding completion uses Convex-backed state with AsyncStorage fallback** → Added `users.onboardingCompletedAt` + `users.completeOnboarding` for durable cross-device routing gates, and local per-user fallback (`musicpromo:onboarding-complete:<clerkUserId>`) so onboarding completion is never blocked by transient offline/write failures.
- 2026-03-04: **Phase 4 renderer strategy is local-first with a Remotion decision gate** → We want preview/export parity without cloud rendering. Phase 4 runs a local Remotion spike (single composition for preview+export) with explicit pass/fail gates (performance, sync, stability, fidelity). If it fails, fallback is a maintained FFmpeg fork behind a renderer abstraction so templates stay standardized.
- 2026-03-04: **Phase 4 implementation keeps FFmpeg active while preserving Remotion path behind abstraction** → Added runtime engine selection (`EXPO_PUBLIC_RENDER_ENGINE`) and shared `spinning-cd` composition inputs used by preview + export. `remotion-local` adapter now executes local rendering through FFmpeg fallback because a production-ready native Remotion runtime is not yet available in this Expo architecture; go/no-go gates remain manual device validation.
- 2026-03-04: **Editor controls split into dedicated `Edit Media` and `Template` surfaces** → Keeps the fast path (media/layout swaps in 1-2 taps) while isolating advanced polish controls (spin/transparency/background) in a separate surface. Chosen to reduce control crowding, preserve trimmer space, and maintain non-destructive state handoff through picker/editor/rendering route params via a typed template tweak contract.
- 2026-03-05: **Template tweak naming standardized to transparency-first (`recordTransparency`)** → Aligns UI language and control semantics with user mental model while preserving legacy `recordOpacity` route payload compatibility in normalization/parsing paths.
- 2026-03-05: **Template-info parity diagnostics shipped across editor → rendering → share** → Added a reusable `TemplateInfoBadge` plus route-param handoff (`showTemplateInfo`) so users can compare preview/export configuration without extra debugging tools.
- 2026-03-05: **Rotation start presets reduced to 4 cardinal angles with explicit direction control** → Simplifies interaction and reduces misconfiguration while keeping creative intent via CW/CCW spin direction.
- 2026-03-06: **Create picker unified into a single audio-first media selection screen** → Replaced split photo/audio browsing with stacked full-size selectors (audio on top, photo on bottom) to reduce context switching and keep both required inputs visible at once.
- 2026-03-06: **Home project management now supports multi-select bulk delete** → Added explicit selection mode (header toggle + long-press entry) and a bottom-centered destructive CTA so users can clean up multiple drafts in one pass without card-by-card deletion.
- 2026-03-06: **Editor actions were anchored directly on preview with modal sheet parity behavior** → Consolidated controls into preview overlays (`settings`, info toggle, `Edit Template`) and standardized template/media surfaces as partial-height sheets with outside-tap and swipe-down dismissal expectations.
- 2026-03-06: **Roadmap sequencing updated to introduce an iOS-native UI adoption phase before broader post-MVP template expansion** → Phase 5 is now dedicated to iOS-native surface/liquid-glass adoption with explicit Android and unsupported-iOS fallbacks.

## 2) Guidance (Methodology for Evolving Prompts)

### 2.1 Context Packaging Rules

- **Always include:**
  - The relevant PRD section (`docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`)
  - The Convex schema and relevant function files
  - The screen/component being worked on
  - Acceptance criteria for the feature being implemented
  - Design reference screenshots from `docs/design-inspiration/` for the relevant screen
- **Never include:**
  - Entire repo dumps
  - Unrelated node_modules or build artifacts
  - Large media files
- **When context is missing:**
  - Check `docs/intake-notes/` for interview decisions
  - Check `docs/design-inspiration/` for reference screenshots and notes
  - If UI/design-related: reference the Edits-inspired design system in PRD Section 9
  - Ask targeted questions, propose defaults, label as assumptions

### 2.2 Standard Workflows

- **Primary:** Plan → Implement → Verify → Refactor → Update PRD
- **For spikes (e.g., FFmpeg rendering):** Spike → Extract learnings → Decide → Implement
- **For bugs:** Debug → Reproduce → Fix → Prevent (test/guardrail)

### 2.3 "Starting Prompts" (Copy/Paste)

#### A) Requirements-to-Spec Prompt

**Goal:** Turn a feature idea into a scoped spec + acceptance criteria.

**Input:**
- Feature description (1-3 sentences)
- Reference the relevant PRD epic

**Output:**
- Scoped feature spec with acceptance criteria
- Entity changes (if any)
- Screens/components affected
- Edge cases

#### B) Architecture Prompt

**Goal:** Propose architecture for a feature consistent with our stack.

**Input:**
- Feature from PRD
- Current Convex schema
- Current file structure

**Output:**
- Convex schema changes (tables, indexes)
- Convex functions (queries, mutations, actions)
- React Native components needed
- File structure changes

#### C) UI Prompt

**Goal:** Propose screen-level implementation.

**Input:**
- Screen from PRD Section 7
- Design reference (when available from Mobbin research)

**Output:**
- Component hierarchy
- States: loading, empty, error, signed-out
- Navigation integration
- Accessibility notes

#### D) Implementation Task Prompt

**Goal:** Convert a spec into an ordered task list.

**Input:**
- Feature spec + acceptance criteria
- Current codebase state

**Output:**
- 3-7 steps, each independently verifiable
- Files to create or modify
- Expo/React Native commands to test locally

### 2.4 Prompt Patterns

- Always request machine-readable outputs (JSON summaries, checklists, acceptance criteria)
- Always separate: assumptions vs facts, v1 vs deferred, must-have vs nice-to-have
- For each session, start with a context header:

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Current phase: [Phase 0/1/2/3/4/5]
Focus: [epic name]
```

**Phase → Epic → Focus mapping:**

```
Phase 0 — Bootstrap
  └── Epic: Authentication & Guest Mode

Phase 1 — MVP Core
  ├── Epic: Create Promo Video
  ├── Epic: Save & Share
  └── Epic: Project History

Phase 2 — Polish
  ├── Epic: Push Notifications
  ├── Epic: Profile & Settings
  └── Epic: Onboarding

Phase 3 — Stabilization
  └── Epic: Release Hardening & Regression

Phase 4 — MVP Finalization
  └── Epic: Template Fidelity & Export Standardization (Local-Only)
      Current status (2026-03-04): renderer abstraction + shared composition shipped for `spinning-cd`; Remotion path is feature-flagged with FFmpeg fallback pending gate results on real devices

Phase 5 — iOS Native Surface Adoption
  └── Epic: iOS Native Surface + Liquid Glass Adoption
      Goal: iOS-native interaction polish (context menus, grouped settings/forms, selective glass surfaces) with strict fallback behavior for Android/unsupported capability paths
```

Work through epics within a phase, then move to the next phase. Update "Current phase" and "Focus" as you go. Examples:

```
Current phase: Phase 0
Focus: Authentication & Guest Mode
```

```
Current phase: Phase 1
Focus: Create Promo Video
```

```
Current phase: Phase 2
Focus: Push Notifications
```

```
Current phase: Phase 4
Focus: Template Fidelity & Export Standardization
```

```
Current phase: Phase 5
Focus: iOS Native Surface + Liquid Glass Adoption
```

## 3) Guardrails (AI-Assisted Reviews and Quality Gates)

### 3.1 Preflight Checklist (Before Coding)

- [ ] Confirm which PRD epic this work belongs to
- [ ] Confirm v1 scope and non-goals for the feature
- [ ] Confirm entities and Convex schema changes needed
- [ ] Confirm screens/components affected
- [ ] Confirm acceptance criteria exists and is testable
- [ ] Check if this feature has Mobbin-dependent design decisions (if so, use reasonable defaults and note them)

### 3.2 Code Review Checklist (Per PR)

- **Correctness:**
  - Matches acceptance criteria from PRD
  - Handles empty, loading, and error states
  - Non-destructive editing preserved (photo/audio independence)
- **Security/privacy:**
  - Clerk auth check on all Convex mutations
  - No PII beyond email stored
  - Guest mode uses Clerk anonymous sessions properly
- **Data integrity:**
  - Convex indexes for queries that will be called frequently (e.g., projects by userId)
  - No accidental full-table scans
- **UX quality:**
  - Two inputs → one output simplicity preserved
  - Graceful error handling (never a dead end)
  - File picker filters for compatible formats
- **Performance:**
  - Video export under 60 seconds
  - No unbounded lists (paginate project history if needed)
  - App cold start under 3 seconds

### 3.3 Regression Tests (Minimum)

- **Unit tests:** Convex function tests (queries, mutations)
- **Integration tests:** TBD
- **Manual test script:**
  - Steps:
    1. Fresh install → sign in with Clerk
    2. Complete onboarding
    3. Create flow: select photo → select audio → trim → preview → export
    4. Verify video plays correctly
    5. Save to camera roll → verify in gallery
    6. Share to Instagram → verify intent opens
    7. Return to projects → verify project appears
    8. Re-open project → change aspect ratio → re-export
    9. Sign out → continue as guest → create video
    10. Delete account from profile
  - Expected results: All steps complete without crashes, errors are graceful

#### Phase 1 Render Flow Regression Checklist (Manual)

- Preconditions:
  - Use a development build (`expo run:ios` or `expo run:android`), not Expo Go
  - Use one valid local photo and one valid local audio file
- Checklist:
  1. Start export, then tap `Cancel` while progress is moving.
  2. Confirm the app returns to the editor and does **not** auto-navigate to Share later.
  3. Trigger a render failure (for example, remove/replace the selected media so export fails), then tap `Try Again`.
  4. Confirm retry starts a new render and completes successfully.
  5. Open Home, verify only one project entry exists for that export attempt (no duplicate draft projects from retry).
  6. Re-open that project, adjust trim and/or aspect ratio, export again, and confirm the same project updates.
  7. On Share, confirm camera-roll save still works and the preview uses the selected photo cover (not a broken video thumbnail).
  8. Tap `Done` and confirm navigation returns cleanly to Home without stale create-flow screens.
- Expected results:
  - Cancel stops rendering behavior and prevents late Share navigation
  - Retry does not create duplicate draft projects
  - Re-export updates existing project metadata
  - Share flow remains functional (save + share intents + clean navigation)

### 3.4 Drift Controls

- **Stop conditions:**
  - If requirements are unclear (especially Mobbin-dependent design), pause and ask or use a reasonable default clearly labeled
  - If scope expands beyond the current phase, propose a phase split
  - If video rendering performance is unacceptable, flag immediately for architecture discussion
- **Update loop:**
  - After implementing a feature, update this document's Decisions Log (Section 1.5)
  - After resolving an open question (e.g., Mobbin design decisions), update the PRD and this document
