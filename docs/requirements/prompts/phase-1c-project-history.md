# Phase 1c: Project History

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/
Current phase: Phase 1
Focus: Project History

Create flow and export are complete. Now build the project history on the Home tab:

1. Home screen: 2-column grid of past projects (thumbnail, title, date). Black "+" FAB bottom-right to start new project. Empty state: "Create your first project" with illustration. Pull to refresh. Reference: docs/design-inspiration/projects-history/

2. Tap a project to re-open in editor with saved settings. User can change aspect ratio or length and re-export.

3. If original files were deleted from device, show "Files not found" error gracefully.

Wire up analytics: project_reopened.
```
