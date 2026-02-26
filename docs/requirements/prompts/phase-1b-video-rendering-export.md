# Phase 1b: Video Rendering + Export

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Create Promo Video — Spinning CD Rendering + Export Flow

The create flow UI (Media Picker + Editor screens) is built. Now implement the actual video rendering and export:

1. Spinning CD template: on-device rendering using FFmpeg-kit for React Native (or best Expo-compatible alternative). User's photo as a spinning CD/record with audio playing. Output MP4. Must complete under 60 seconds. Continue rendering if app is backgrounded.

2. Rendering progress screen (dark theme): percentage indicator, video preview with gradient border, "Please don't close" message. Reference: docs/design-inspiration/post-export/

3. Share screen (dark theme): "Ready to share" heading, video preview, "Share to Instagram" gradient button, "Share to TikTok" button, auto-save to camera roll. Use native share intents (expo-sharing). Reference: docs/design-inspiration/post-export/

4. Save project metadata to Convex after export.

Wire up analytics: video_exported, video_saved_to_camera_roll, share_tapped_instagram, share_tapped_tiktok.
```
