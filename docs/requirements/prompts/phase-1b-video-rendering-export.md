# Phase 1b: Video Rendering + Export

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Create Promo Video — Spinning CD Rendering + Export Flow

## Prerequisites

Phase 1a is complete. The create flow UI (Media Picker + Editor/Trimmer screens) is built. The Export button in app/create/editor.tsx currently shows a placeholder alert — that is the entry point for this phase.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan → Implement → Verify → Refactor → Update PRD (Section 2.2).

## Step 0 — FFmpeg Spike

FFmpeg-kit + Expo compatibility is a known risk (see Agent Design Section 1.5 and Section 2.2 spike workflow). Before building features:

1. Install ffmpeg-kit-react-native (or best Expo-compatible alternative — research current compatibility with Expo SDK 54 / React Native 0.81).
2. Write a minimal spike: take a static image, overlay audio, output a 5-second MP4 to the file system.
3. Verify it runs on both iOS and Android simulators.
4. If ffmpeg-kit is incompatible, evaluate alternatives (e.g., expo-video compositing, react-native-video-processing) and document the decision in the Decisions Log.

Only proceed to Step 1 after the spike succeeds.

## Step 1 — Spinning CD Video Rendering

Implement on-device rendering that composites the user's photo as a spinning CD/record with their trimmed audio clip.

- Input: photoUri, audioUri, trimStart, trimEnd, aspectRatio (all available from editor.tsx params/state)
- Output: MP4 file written to app cache directory
- Constraint: must complete in under 60 seconds (Agent Design Section 3.2)
- The rendering should continue if the app is backgrounded — use expo-task-manager or equivalent to keep the process alive. If backgrounding is not feasible, at minimum ensure the render is not killed by navigating away within the app.

Create a rendering utility (e.g., src/lib/renderVideo.ts) that accepts the inputs and returns a promise resolving to the output file path. Keep rendering logic separate from UI.

## Step 2 — New Screens and Navigation

Add two new screens to the create flow stack:

- app/create/rendering.tsx — rendering progress screen
- app/create/share.tsx — post-export share screen
- Update app/create/_layout.tsx to register both new Stack.Screen entries

Wire up app/create/editor.tsx: replace the placeholder Alert in handleExport with navigation to the rendering screen, passing photoUri, audioUri, trimStart, trimEnd, and aspectRatio.

### Rendering screen (dark theme):
- Percentage/progress indicator showing render progress
- Video preview area with gradient border
- "Please don't close the app" message
- On completion, auto-navigate to the share screen
- Reference: docs/design-inspiration/post-export/note.txt (text notes — no PNGs; use Meta's Edits app as primary visual reference)

### Share screen (dark theme):
- "Ready to share" heading
- Video preview/thumbnail
- "Share to Instagram" gradient button — use native share intent via expo-sharing
- "Share to TikTok" button — use native share intent via expo-sharing
- Auto-save exported video to camera roll on arrival (use expo-media-library)
- "Done" or back button returns to Home tab
- Reference: docs/design-inspiration/post-export/note.txt (text notes — use Meta's Edits app as visual reference)

## Step 3 — Save Project Metadata to Convex

The projects table already exists in convex/schema.ts with fields: userId, title, templateId, aspectRatio, videoLength, photoUri, audioUri, exportedVideoUri, status, createdAt, updatedAt.

Review the schema — you may need to add trimStart (v.number()) and trimEnd (v.number()) fields to persist the user's trim selection.

Create convex/projects.ts with:
- create mutation — save a new project with status "draft" when export starts
- markExported mutation — update status to "exported" and set exportedVideoUri when rendering completes
- listByUser query — return projects for the current user, ordered by updatedAt desc (used by Phase 1c)
- Auth check required on all mutations (Clerk identity — see convex/users.ts for pattern)

## Step 4 — New Dependencies

These packages are not yet in package.json and will be needed:
- expo-sharing (native share intents)
- expo-media-library (save to camera roll)
- ffmpeg-kit-react-native or whatever alternative the spike in Step 0 determines
- expo-task-manager (if needed for background rendering)

Install via `npx expo install <package>` to ensure Expo-compatible versions.

## Step 5 — Analytics

Wire up PostHog events (add to src/lib/analytics.ts event types):
- video_export_started — when user taps Export
- video_exported — when rendering completes successfully
- video_export_failed — if rendering fails (with error reason)
- video_saved_to_camera_roll — when auto-save completes
- share_tapped_instagram — when user taps Share to Instagram
- share_tapped_tiktok — when user taps Share to TikTok

## Step 6 — Verify and Update Docs

1. Test the full flow: Editor → Export → Rendering progress → Share → Instagram/TikTok intent → Camera roll save
2. Verify export completes in under 60 seconds for a 30-second clip
3. Verify rendering survives app backgrounding
4. Verify project metadata is saved to Convex
5. Update the Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with any architectural decisions made (FFmpeg choice, background rendering approach, etc.)
```
