# Agent Design Requirements — MusicPromo

## Doc Metadata

- Project / repo: MusicPromo (`/home/nick/MusicPromo`)
- Product name: MusicPromo
- Owners: Nick
- Date: 2026-02-20
- Version: 1.0 (initial intake)
- Links: PRD at `docs/example/PRODUCT_DESIGN_REQUIREMENTS.md`

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
- **Navigation model:** Bottom tabs or hamburger (TBD) — sections: Create, Projects, Profile
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

## 2) Guidance (Methodology for Evolving Prompts)

### 2.1 Context Packaging Rules

- **Always include:**
  - The relevant PRD section (`docs/example/PRODUCT_DESIGN_REQUIREMENTS.md`)
  - The Convex schema and relevant function files
  - The screen/component being worked on
  - Acceptance criteria for the feature being implemented
- **Never include:**
  - Entire repo dumps
  - Unrelated node_modules or build artifacts
  - Large media files
- **When context is missing:**
  - Check `docs/intake-notes/` for interview decisions
  - If UI/design-related: note that Mobbin research is pending and propose a reasonable default
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
PRD: docs/example/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/example/AGENT_DESIGN_REQUIREMENTS.md
Current phase: [Phase 0/1/2]
Focus: [feature or task]
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

### 3.4 Drift Controls

- **Stop conditions:**
  - If requirements are unclear (especially Mobbin-dependent design), pause and ask or use a reasonable default clearly labeled
  - If scope expands beyond the current phase, propose a phase split
  - If video rendering performance is unacceptable, flag immediately for architecture discussion
- **Update loop:**
  - After implementing a feature, update this document's Decisions Log (Section 1.5)
  - After resolving an open question (e.g., Mobbin design decisions), update the PRD and this document
