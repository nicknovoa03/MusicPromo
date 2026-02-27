# Phase 3b: Project Editing Core

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/create-flow/, docs/design-inspiration/general-vibe/, docs/design-inspiration/add-project-name/
Current phase: Phase 3
Focus: Project Editing Core

## Goal

Evolve the current editor from "export settings" into a true project editing workflow while preserving MusicPromo simplicity.

This phase should make reopening projects feel like real editing, not just re-export setup.

## Scope

In scope:
- Editable project title from editor and/or project actions flow
- Live project autosave for core fields (title, aspectRatio, trimStart, trimEnd, media swaps)
- Clear draft/saved state in editor UI
- Safer media replacement flow (replace photo/audio in-place without losing other edits)
- Better "missing file" recovery path for reopened projects

Out of scope (defer):
- Multi-track timelines
- Keyframes, effects stack, text overlays
- Collaborative editing
- Cloud file sync/backup

## Project Naming UX Reference (Required)

Use `docs/design-inspiration/add-project-name/` as behavioral guidance:
- User taps the title area in editor header (for example `New project` with chevron)
- A compact modal/sheet appears above keyboard with:
  - title: `Project name`
  - text input
  - close/cancel control
  - `Done` action (disabled when empty, enabled with valid text)
- On Done, editor header updates immediately and the new title is persisted via autosave

Constraints:
- Preserve a valid fallback title (for example `New Project`) if user clears text and exits
- Keep interaction lightweight and fast (no full-screen route change)
- Do not block editing tools while title is unchanged

## Step 1 - Data Contract For Editing

Files:
- convex/schema.ts (if needed)
- convex/projects.ts

Requirements:
- Confirm project model supports all editor-owned fields
- Add/adjust mutations for partial autosave updates (ownership-checked)
- Ensure updatedAt is refreshed on every edit mutation

## Step 2 - Editor State Model Refactor

Files:
- app/create/editor.tsx

Requirements:
- Separate initial project load from mutable editor state
- Prevent route param churn from becoming source-of-truth after mount
- Keep a single local editor state object for:
  - title
  - aspectRatio
  - trimStart / trimEnd
  - photoUri / audioUri + display names
- Add local transient UI state for project-name modal visibility and input draft value

## Step 3 - Autosave + Save Feedback

Files:
- app/create/editor.tsx
- convex/projects.ts

Requirements:
- Debounced autosave while editing reopened projects
- Save states: `saving`, `saved`, `save_error`
- No blocking spinner for normal editing interactions
- Retry strategy for transient save failures

## Step 4 - Media Replacement UX

Files:
- app/create/editor.tsx
- app/create/picker.tsx

Requirements:
- Replacing photo preserves audio + trims + aspect ratio + title
- Replacing audio preserves photo + aspect ratio + title and clamps trim safely
- Return from picker to editor should feel lossless and immediate

## Step 5 - Missing File Recovery Flow

Files:
- app/create/editor.tsx

Requirements:
- If photo/audio file is missing, show targeted recovery CTA(s)
- Recovery should reopen picker directly to missing media type
- Once replaced, clear missing state and resume editing/export

## Step 6 - Analytics Contract

Files:
- src/lib/analytics.ts
- editor/picker screens

Track at minimum:
- `project_edit_started`
- `project_autosave_succeeded`
- `project_autosave_failed`
- `project_media_replaced`
- `project_title_updated`
- `project_title_edit_opened`

## Step 7 - QA Script

1. Open existing project and change title/aspect/trim; verify autosave status transitions.
2. Back out to Home and reopen; confirm edits persisted.
3. Replace only photo; verify audio + trim remain intact.
4. Replace only audio; verify photo remains and trim is clamped safely.
5. Simulate missing media and recover via targeted CTA.
6. Export from edited project and verify final output reflects latest saved edits.
7. Confirm new edit/autosave events in PostHog.

## Step 8 - Documentation Updates

After implementation, update:
- docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
- docs/requirements/AGENT_DESIGN_REQUIREMENTS.md (Decisions Log)
- docs/requirements/summary.json

Document what "project editing" includes in this phase vs deferred advanced editing.
```
