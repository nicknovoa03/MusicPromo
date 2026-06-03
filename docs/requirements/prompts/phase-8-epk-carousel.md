# Phase 8: EPK Carousel

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Planning Spec: docs/requirements/EPK_CAROUSEL_REQUIREMENTS.md
Current phase: Phase 8
Focus: Add EPK Carousel as a second project type alongside the existing Music Promo video, gated by a new project type picker at the create flow entry point.

## Prerequisites

- Phase 7 Search, public profiles, and showcase flows are stable.
- The existing create → picker → editor → rendering → share flow must be preserved without modification.
- No new cloud storage dependency is introduced — EPK artwork stays on-device only.

Before coding:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` Section 3.1.
- Read `docs/requirements/EPK_CAROUSEL_REQUIREMENTS.md` in full.
- Inspect `convex/schema.ts`, `convex/projects.ts`, `app/(tabs)/create.tsx`, and `app/create/_layout.tsx`.
- Inspect `src/components/ProjectThumbnail.tsx` to understand the existing thumbnail rendering before adding the EPK badge.
- Preserve existing Home, Create, Profile, Search, project history, and export behavior.

## Goal

Introduce the EPK (Electronic Press Kit) Carousel as a second project type. An EPK is 4 static-image slides — cover, track details, vision/concept, and artist bio — designed to be shared as an Instagram carousel. Add a project type picker as the new create-flow entry point to route users into either the existing Music Promo video flow or the new EPK flow.

## Scope

In scope:
- Project type picker screen replacing direct-to-editor navigation from the create tab
- EPK create flow: step 1 (artwork + title), step 2 (vision text), step 3 (slide preview + export)
- 4 EPK slide components: Cover, Track Details, Vision/Concept, Artist Bio
- `react-native-view-shot` export — 4 JPEGs shared via iOS/Android share sheet
- Convex schema additions: `type` and `vision` fields on the `projects` table
- EPK badge overlay on ProjectThumbnail for EPK projects in the home/history list
- EPK projects in the history list open at the slide preview step for re-export

Out of scope:
- Per-slide color/font customization — fixed dark editorial theme
- Audio trimming or video rendering for EPK projects
- Web or desktop support
- Cloud storage for EPK artwork
- Changes to the existing Music Promo create/editor/rendering/share flow

## Execution Tickets (Recommended Order)

Run Phase 8 as four shippable slices:
1. `8a-schema-type-picker`
2. `8b-epk-create-flow`
3. `8c-epk-slide-components`
4. `8d-epk-export-persistence`

Each ticket must be independently verifiable and must not regress the Music Promo create flow.

## Step 1 - Schema and Type Picker

Files:
- `convex/schema.ts`
- `convex/projects.ts`
- `app/(tabs)/create.tsx`
- New `app/create/type-picker.tsx`
- `app/create/_layout.tsx`

Requirements:
- Add two optional fields to the `projects` table in `convex/schema.ts`:
  ```ts
  type: v.optional(v.union(v.literal("video"), v.literal("epk"))),
  vision: v.optional(v.string()),
  ```
- Existing records without `type` are treated as `"video"` at read time — no migration needed.
- Replace the create tab's direct navigation to picker with navigation to the new type picker screen.
- Type picker presents two cards: "Music Promo" and "EPK Carousel".
- "Music Promo" routes into the existing `create/picker.tsx` flow unchanged.
- "EPK Carousel" routes into the new `create/epk/` flow.
- Type picker has a back/close button to dismiss without creating a project.

Acceptance criteria:
- Existing Music Promo create flow still launches and completes without regression.
- Type picker is dismissable without side effects.
- Schema compiles and Convex deployment succeeds.

## Step 2 - EPK Create Flow Screens

Files:
- New `app/create/epk/_layout.tsx`
- New `app/create/epk/details.tsx` — step 1: artwork + title
- New `app/create/epk/vision.tsx` — step 2: vision text
- New `app/create/epk/preview.tsx` — step 3: slide preview + export

Requirements:
- **Details screen (step 1):** Two entry paths — "Link to existing project" (scrollable list of the user's Music Promo projects, selecting one pre-fills `title` and `photoUri`) and "Start fresh" (photo picker + text input for track title). Cannot advance without both a photo and a title.
- **Vision screen (step 2):** Text input labeled "Vision / Concept", placeholder "What's the story behind this track?", 280-character limit with live counter, required to advance.
- **Preview screen (step 3):** Full-screen swiper over all 4 slides, dot pagination indicator, back button to return to vision step, Export button fixed at bottom and accessible from any slide. If the user's bio or social links are empty, show an inline nudge with a shortcut to the profile edit screen.

Acceptance criteria:
- Cannot advance past details step without both photo and title.
- Cannot advance past vision step with empty vision field.
- Back navigation works at each step.
- Preview swiper shows all 4 slides with correct data from the form.

## Step 3 - EPK Slide Components

Files:
- New `src/components/epk/EpkCoverSlide.tsx`
- New `src/components/epk/EpkTrackDetailsSlide.tsx`
- New `src/components/epk/EpkVisionSlide.tsx`
- New `src/components/epk/EpkBioSlide.tsx`

Requirements:
- All slides: 1:1 aspect ratio, dark editorial theme (near-black background, white/off-white text).
- **Slide 1 — Cover:** full-bleed artwork with darkened overlay; artist name (top-left, large); track title (bottom-left, medium); social handle row capped at 4 platforms in the user's sort order (bottom-right).
- **Slide 2 — Track Details:** "TRACK DETAILS" label in small caps; track title very large; any available meta (linked promo template name, audio clip length).
- **Slide 3 — Vision/Concept:** "VISION" label in small caps; vision text in large block-quote style with opening and closing curly quotes; artist name (bottom-right, small attribution style).
- **Slide 4 — Artist Bio:** circular artist avatar (if available); artist name; bio text; row of social platform icons with links.
- Data sources per slide are specified in `docs/requirements/EPK_CAROUSEL_REQUIREMENTS.md` Section 5.

Acceptance criteria:
- All 4 slides render without crash in both preview swiper and export capture.
- Empty optional fields (bio, avatar, social links) degrade gracefully.
- Slides match the dark editorial visual spec.

## Step 4 - Export and Persistence

Files:
- `app/create/epk/preview.tsx`
- `convex/projects.ts`
- `src/components/ProjectThumbnail.tsx`
- `app/(tabs)/index.tsx`

Requirements:
- Tapping "Export" captures each slide as a JPEG using `react-native-view-shot` at the slide's rendered pixel density (target 1080×1080 per slide).
- After capture, open the iOS/Android share sheet with all 4 images attached; user can also save individually to camera roll.
- Export must complete in under 10 seconds on a mid-tier device.
- On successful export, save the EPK project to Convex with `status: "exported"`, `type: "epk"`, and the `vision` field.
- EPK projects appear in the home/history tab project list with an "EPK" badge overlay on the thumbnail.
- Tapping an EPK project from the list opens it at the slide preview step for re-export.

Acceptance criteria:
- 4 JPEG images are produced and share sheet opens successfully.
- EPK project appears in the home list with the EPK badge.
- Re-opening an EPK project from the home list lands at the preview step with correct data.
- Export errors surface a recoverable error state.

## QA Contract

Manual test script:
1. Existing Music Promo flow: open create tab, select Music Promo from type picker, create a promo, export, save/share — verify no regression.
2. EPK flow — link path: select EPK Carousel, choose "Link to existing project", verify artwork and title pre-fill from a Music Promo project.
3. EPK flow — fresh path: select EPK Carousel, choose "Start fresh", pick artwork, enter title and vision, advance to preview.
4. Preview swiper: swipe through all 4 slides, verify data accuracy (artist name, bio, links, vision text).
5. Empty profile state: remove bio and all social links, open EPK preview, confirm inline nudge appears with profile edit shortcut.
6. Export: tap Export, confirm 4 JPEGs are attached in share sheet, save to camera roll, confirm project saved in home list with EPK badge.
7. Re-open EPK project from home list, verify it opens at preview step with correct data and allows re-export.
8. Home list: confirm Music Promo projects show no EPK badge; EPK projects show badge.
9. Run lint/typecheck and iOS smoke test.

## Documentation Updates

After implementation, update:
- `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`
- `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md`
- `docs/requirements/summary.json`
- This prompt if execution order changes

## Acceptance Criteria (Must Pass)

- Type picker is the new create-flow entry point and is dismissable.
- Existing Music Promo create/export/share flow is unchanged.
- EPK flow completes: artwork + title → vision → preview → export.
- 4 EPK slides render the correct data from the user's project and profile.
- Export produces 4 JPEGs and opens the system share sheet.
- EPK projects are persisted to Convex on export and appear in the home list with an EPK badge.
- Re-opening an EPK project from history lands at the preview/re-export step.
- No new cloud storage dependency is introduced.
```
