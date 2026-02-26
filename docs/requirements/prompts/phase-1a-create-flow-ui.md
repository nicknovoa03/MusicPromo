# Phase 1a: Create Flow — Media Picker + Editor UI

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Create Promo Video — Media Picker + Editor UI

Phase 0 is complete (Expo, Clerk auth, Convex, PostHog, 3-tab navigation shell).

Build the 2-screen create flow (UI and navigation only — no video rendering yet, use a placeholder for the preview):

1. Media Picker screen (light theme): tabbed Photo/Audio picker. Photo from camera roll (expo-image-picker), Audio from files (expo-document-picker, MP3/WAV/M4A). Cancel + Add buttons in header. Reference: docs/design-inspiration/create-flow/

2. Editor/Trimmer screen (dark theme): placeholder video preview area, audio trimmer with drag handles (15-60s), aspect ratio toggle (9:16 / 1:1), play/pause, Export button. Non-destructive — swapping photo keeps audio and vice versa. Reference: docs/design-inspiration/create-flow/ and docs/design-inspiration/general-vibe/

Wire up analytics: create_started, photo_selected, audio_selected, preview_viewed.

Run the Preflight Checklist (Agent Design Section 3.1) before coding.
```
