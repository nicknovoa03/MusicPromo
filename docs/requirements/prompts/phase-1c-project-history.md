# Phase 1c: Project History

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Project History

## Prerequisites

Phase 1b is complete. The app can: pick media, trim audio, render a spinning CD video, export to MP4, save to camera roll, share to Instagram/TikTok, and save project metadata to Convex. The convex/projects.ts file has create, markExported, and listByUser functions.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan → Implement → Verify → Refactor → Update PRD (Section 2.2).

## Step 1 — Home Screen Project Grid

Replace the placeholder Home screen with a project history view.

File: app/(tabs)/index.tsx (replace existing placeholder)

UI (light theme):
- 2-column grid of past projects using FlatList with numColumns={2}
- Each project card: thumbnail (from photoUri or exported video frame), title (or "Untitled Project"), creation date
- Sorted by most recent first (updatedAt desc)
- Pull-to-refresh to reload project list
- Black "+" FAB (floating action button) in bottom-right corner — tapping it navigates to the create flow (app/create/picker)

Data source: use the listByUser query from convex/projects.ts. This already returns projects ordered by updatedAt desc.

Pagination: if the project list can grow unboundedly, implement cursor-based pagination (Agent Design Section 3.2 requires no unbounded lists). For v1, if the list is small enough, simple loading is acceptable — but add a TODO comment noting pagination should be added if the list grows.

Reference: docs/design-inspiration/projects-history/note.txt (text notes describing 2-column grid layout)

## Step 2 — Empty State

When the user has no projects yet, show an empty state instead of the grid:
- Centered illustration or icon (e.g., Ionicons film-outline or musical-notes)
- "Create your first promo" heading
- "Tap + to get started" subtitle
- The "+" FAB should still be visible

## Step 3 — Re-open Project in Editor

Tapping a project card should re-open the project in the editor with its saved settings:
- Navigate to app/create/editor.tsx passing the saved photoUri, audioUri, photoName, audioName, aspectRatio, trimStart, trimEnd
- User can change aspect ratio, re-trim audio, or swap media, then re-export
- On re-export, update the existing project record in Convex (don't create a duplicate)

Create a new Convex mutation if needed:
- convex/projects.ts — update mutation to patch an existing project's settings and re-set status to "exported" with new exportedVideoUri

## Step 4 — File Not Found Handling

If the original photo or audio files were deleted from the device between sessions:
- When opening a project, check if the file URIs are still accessible (use expo-file-system getInfoAsync)
- If files are missing, show a graceful error: "Files not found" message with an explanation that the original files may have been moved or deleted
- Allow the user to swap in new files from the editor (non-destructive — they can replace just the missing file)

New dependencies needed:
- expo-file-system (may already be installed — check package.json first)

## Step 5 — FAB Navigation

The "+" FAB button should navigate to the create flow. Clarification on behavior:
- Tapping "+" navigates to app/create/picker (the Media Picker screen)
- This starts a fresh project (no pre-filled media)
- The Create tab in the bottom bar should also navigate to picker (existing behavior from Phase 0)

## Step 6 — Analytics

Wire up PostHog events (add to src/lib/analytics.ts if not already defined):
- project_reopened — when user taps an existing project card (with metadata: projectId)

## Step 7 — Verify and Update Docs

1. Test: export a video in the create flow → return to Home → project appears in grid with thumbnail and date
2. Test: tap project → editor opens with saved settings → change aspect ratio → re-export → project updates (not duplicated)
3. Test: empty state shows correctly for new users with no projects
4. Test: delete a photo from the device → open the project → "Files not found" error displays gracefully
5. Test: pull-to-refresh reloads the project list
6. Test: "+" FAB navigates to picker
7. Verify PostHog event fires for project_reopened
8. Update the Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with any architectural decisions made
```
