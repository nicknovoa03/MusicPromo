# Phase 1a: Create Flow — Media Picker + Editor UI

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Create Promo Video — Media Picker + Editor UI

## Prerequisites

Phase 0 is complete. The app has: Expo project with file-based routing, Clerk auth (Apple/Google/Guest), Convex backend with user schema, PostHog analytics, and a 3-tab navigation shell (Home, Create, Profile). Design tokens are in src/constants/tokens.ts.

Before writing any code, run the Preflight Checklist from the Agent Design doc (Section 3.1). Follow the standard workflow: Plan → Implement → Verify → Refactor → Update PRD (Section 2.2).

## Step 1 — Media Picker Screen

Build the first screen of the 2-screen create flow. This is the media selection screen where users pick their photo and audio file.

File: app/create/picker.tsx (replace placeholder from Phase 0)

UI (light theme):
- Header with Cancel (left) and Add/Next (right, disabled until both media selected)
- Tabbed interface: "Photos" tab and "Audio" tab — same visual layout for both, user tabs between them
- Photos tab: grid of camera roll photos via expo-image-picker. Tap to select, shows checkmark.
- Audio tab: file browser for audio files via expo-document-picker. Filter to MP3/WAV/M4A only.
- Selected media indicators showing what's been picked so far
- When both photo and audio are selected, tapping Add/Next navigates to the Editor screen, passing photoUri, photoName, audioUri, audioName as route params

Reference: docs/design-inspiration/create-flow/note.txt (text notes describing the tabbed picker)

New dependencies needed:
- expo-image-picker
- expo-document-picker

## Step 2 — Editor/Trimmer Screen

Build the second screen of the create flow. This is where the user previews and trims their media before exporting.

File: app/create/editor.tsx (replace placeholder from Phase 0)

UI (dark theme):
- Header: close button (left), "New Project" title (center), Export button (right, accent color)
- Video preview area: display the selected photo with a spinning CD overlay placeholder (static visual — actual rendering comes in Phase 1b). Aspect ratio determines preview dimensions.
- Playback controls: play/pause button, timestamp display
- Aspect ratio toggle: 9:16 (vertical) and 1:1 (square) — changing this resizes the preview
- Media swap chips: "Photo" chip and "Audio" chip below the preview. Tapping either navigates back to picker to swap that media without losing the other (non-destructive editing).
- Audio trimmer: drag handles to select a 15-60 second segment from the audio. Show waveform or progress bar with start/end handles.
- Export button: placeholder alert for now ("Video rendering not yet implemented") — Phase 1b will replace this

Supporting components to create:
- src/components/create/AudioTrimmer.tsx — trimmer with drag handles, min 15s / max 60s
- src/components/create/AspectRatioToggle.tsx — toggle between 9:16 and 1:1
- src/components/create/TrimHandle.tsx — draggable handle component

Reference: docs/design-inspiration/create-flow/note.txt and docs/design-inspiration/general-vibe/

## Step 3 — Navigation Wiring

Update the create flow stack to register the screens:
- app/create/_layout.tsx — Stack navigator with picker and editor screens, slide_from_right animation, dark background for editor
- app/(tabs)/create.tsx — redirect to app/create/picker when Create tab is tapped

Ensure back navigation works: Editor → back → Picker. Close button on Editor → back to tabs.

## Step 4 — Analytics

Wire up PostHog events (types already defined in src/lib/analytics.ts):
- create_started — when user enters the create flow (picker screen mounts)
- photo_selected — when user picks a photo (with metadata: source)
- audio_selected — when user picks an audio file (with metadata: format, duration if available)
- preview_viewed — when editor screen mounts (with metadata: hasPhoto, hasAudio)

## Step 5 — Verify and Update Docs

1. Test: Home tab → tap Create → Media Picker opens → select photo → select audio → tap Add → Editor opens with both media shown
2. Test non-destructive editing: on Editor, tap photo chip → goes back to picker → change photo → return to Editor → audio is still there
3. Test aspect ratio toggle: 9:16 and 1:1 resize the preview correctly
4. Test audio trimmer: drag handles constrain to 15-60s range
5. Test Cancel: from picker, Cancel returns to Home tab
6. Verify PostHog events fire for each action
7. Update the Decisions Log in docs/requirements/AGENT_DESIGN_REQUIREMENTS.md Section 1.5 with any architectural decisions made
```
