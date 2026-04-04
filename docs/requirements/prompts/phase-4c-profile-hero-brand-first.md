# Phase 4c: Profile Hero Brand-First Redesign

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/Profile screens/
Current phase: Phase 4c
Focus: Hero-first profile UI with large brand-forward identity treatment

## Prerequisites

- Phase 2b profile/settings behavior is already functional (edit/save profile, links, sign out, delete account).
- Existing Convex + local guest profile write paths are stable.

## Goal

Redesign the profile screen so the top half is a wide, cinematic identity area that makes the artist brand visually dominant, while preserving all current profile and account behaviors.

## Step 1 - Preserve Existing Data + Behavior Contract

File:
- `app/(tabs)/profile.tsx`

Requirements:
- Keep existing read/write behavior for signed-in and guest/local sessions.
- Keep existing save flow, loading/disabled states, and error handling.
- Keep profile links editing path intact.
- Keep sign-out and delete-account flows unchanged.

## Step 2 - Implement Hero-First Layout

File:
- `app/(tabs)/profile.tsx`

Layout requirements:
- Top 45-55% of screen is a wide hero/banner treatment.
- Large profile image (not utility-sized) with visual emphasis and overlap treatment.
- Strong hierarchy in hero:
  - artist name
  - secondary identity line
  - short supporting context line
- Add quick actions directly in hero:
  - primary: change photo
  - secondary: edit name

Visual requirements:
- Dark, high-contrast, cinematic treatment.
- Add layered depth (image + tint + soft fade) for readability.
- Avoid default white card-first profile composition.

## Step 3 - Keep Editing Functional But Visually Secondary

File:
- `app/(tabs)/profile.tsx`

Requirements:
- Identity editing section remains available below hero.
- Connected platform links remain editable below hero.
- Save CTA remains clear and easy to reach.
- Account actions remain grouped and legible at bottom.

## Step 4 - QA + Acceptance

QA checklist:
1. Avatar can be picked/updated/removed from redesigned surface.
2. Artist name can be edited and saved.
3. Link add/edit/remove/save still works.
4. Signed-in and guest/local data paths both persist correctly.
5. Sign out flow unchanged.
6. Delete account flow unchanged.
7. Error/loading states still visible and recoverable.

Acceptance criteria:
- Profile feels brand-first and visually distinctive.
- Top-half hero composition is the dominant visual element.
- No regressions in profile data behavior or account safety flows.
```
