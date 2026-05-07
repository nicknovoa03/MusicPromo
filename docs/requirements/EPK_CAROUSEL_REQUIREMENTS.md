# EPK Carousel — Phase 8 Requirements

## Doc Metadata

- Phase: 8
- Feature: EPK Carousel
- Doc owner: Nick
- Created: 2026-05-07
- Status: Draft
- GitHub issue: #24

---

## 1. Summary

Phase 8 introduces the EPK (Electronic Press Kit) Carousel as a second project type alongside the existing Music Promo video. An EPK is a set of 4 styled static-image slides — cover, track details, vision/concept, and artist bio — designed to be shared as an Instagram carousel.

This phase also introduces a **project type picker** at the top of the create flow, replacing the current direct-to-editor navigation. The picker presents two options: Music Promo (existing) and EPK Carousel (new).

---

## 2. Goals

- Let artists generate a shareable EPK carousel in the same app they already use for promo videos
- Add a project type picker as infrastructure for future project types
- Keep the EPK flow as simple as the video flow: fill in a few fields, hit export
- Persist EPK projects to Convex so users can revisit and re-export

---

## 3. Non-Goals

- No per-slide customization controls (colors, fonts) — fixed dark editorial theme
- No audio trimming or video rendering for EPK projects
- No web or desktop support
- No cloud storage for EPK artwork — on-device only (same as the video flow)

---

## 4. User Stories

### 4.1 Project type picker

> As an artist, when I tap the create tab I want to choose what kind of project I'm making so the right flow launches.

**Acceptance criteria:**
- The create tab entry point shows a picker screen with 2 cards: "Music Promo" and "EPK Carousel"
- "Music Promo" routes into the existing picker → editor → rendering → share flow (no change to that flow)
- "EPK Carousel" routes into the new EPK flow
- The picker screen has a back/close button to dismiss without creating a project

### 4.2 EPK create flow — artwork + title

> As an artist, I want to start an EPK by picking the track artwork and title, either from an existing Music Promo project or from scratch.

**Acceptance criteria:**
- The EPK flow's first step presents two options: "Link to existing project" and "Start fresh"
- **Link:** shows a scrollable list of the user's existing Music Promo projects; selecting one pre-fills `title` and `photoUri`
- **Start fresh:** shows a photo picker (same library call as the existing picker screen) and a text input for track title
- Cannot advance without both a photo and a title

### 4.3 EPK create flow — vision/concept

> As an artist, I want to write a statement about the vision or concept behind my track so it appears in the carousel.

**Acceptance criteria:**
- Step 2 is a text input screen labeled "Vision / Concept"
- Placeholder text: "What's the story behind this track?"
- Character limit: 280 characters (shown as a counter)
- This field is required to advance — cannot export with an empty vision
- The current draft is auto-saved as the user types (local state; persisted to Convex on export)

### 4.4 Slide preview

> As an artist, I want to preview my 4 EPK slides before I export them.

**Acceptance criteria:**
- Step 3 is a full-screen swiper — one slide fills the screen, swipe left/right to move through all 4
- Dot pagination indicator shows current slide position (e.g. ● ○ ○ ○)
- Slide data shown accurately reflects: artwork, title, vision text, user profile bio, user profile artist name, user profile social links
- If the user's bio is empty or they have no social links, an inline nudge is shown with a shortcut to the profile edit screen
- A "back" button lets the user return to step 2 to edit the vision text
- An "Export" button is accessible from any slide (fixed at bottom of screen)

### 4.5 Export

> As an artist, I want to export my 4 EPK slides as images I can share.

**Acceptance criteria:**
- Tapping "Export" captures each slide as a JPEG using `react-native-view-shot`
- Exported at the slide's rendered pixel density (target: 1080×1080 per slide for 1:1)
- After capture, the iOS/Android share sheet opens with all 4 images attached
- The user can also save each image individually to camera roll
- Export completes in under 10 seconds on a mid-tier device
- The EPK project is saved to Convex on successful export (status: "exported")

### 4.6 EPK project persistence

> As an artist, I want my EPK projects saved in my project history so I can revisit them.

**Acceptance criteria:**
- EPK projects appear in the home/history tab project list alongside video projects
- EPK projects show the artwork thumbnail with an "EPK" badge overlay
- Tapping an EPK project from the list opens it at the slide preview step
- The user can re-export at any time from the preview step

---

## 5. Slide Designs

All slides: 1:1 aspect ratio, dark editorial theme (near-black background, white/off-white text, single accent treatment).

### Slide 1 — Cover

```
[Full-bleed artwork, darkened overlay]
  [Top-left] Artist name (large)
  [Bottom-left] Track title (medium)
  [Bottom-right] Social handle row — max 4 platform icons, in user's sort order
```

Data sources: `project.photoUri`, `user.artistName`, `user.links` (first 4 by `sortOrder`)

### Slide 2 — Track Details

```
[Background: solid near-black or blurred artwork]
  [Top] "TRACK DETAILS" label (small caps)
  [Middle] Track title (very large)
  [Below] Any available meta: linked promo template name, audio clip length
```

Data sources: `project.title`, `project.templateId`, `project.trimStart/trimEnd`

### Slide 3 — Vision / Concept

```
[Background: solid dark]
  [Top] "VISION" label (small caps)
  [Middle] Vision text in large block-quote style — opening " and closing " curly quotes
  [Bottom-right] Artist name (small, attribution style)
```

Data sources: `project.vision`, `user.artistName`

### Slide 4 — Artist Bio

```
[Background: solid dark]
  [Top-left] Artist avatar (circular, if available)
  [Next to avatar] Artist name
  [Below] Bio text
  [Bottom] Row of social platform icons with links
```

Data sources: `user.artistName`, `user.avatarImageUrl`, `user.bio`, `user.links`

---

## 6. Data Model Changes

### projects table

Add two optional fields:

```ts
type: v.optional(v.union(v.literal("video"), v.literal("epk"))),
vision: v.optional(v.string()),
```

- Existing records without `type` are treated as `"video"` at read time
- `vision` is only relevant when `type === "epk"`

---

## 7. Navigation / Route Structure

```
(tabs)/create.tsx           → project type picker (new screen)
create/type-picker.tsx      → same as above, or inline in tab
create/epk/details.tsx      → step 1: artwork + title
create/epk/vision.tsx       → step 2: vision text
create/epk/preview.tsx      → step 3: slide preview + export
```

The existing `create/picker.tsx → create/editor.tsx → create/rendering.tsx → create/share.tsx` flow is unchanged.

---

## 8. Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Full-screen swiper or thumbnail strip for slide preview? | Full-screen swiper with dot pagination |
| 2 | Vision slide — block quote with marks, or plain text? | Block quote with large curly quotation marks |
| 3 | Show profile edit shortcut when bio/links are missing? | Yes — inline nudge with shortcut in preview step |
| 4 | Store EPK artwork to Convex cloud, or on-device only? | On-device only |
| 5 | Cap social links on Cover slide? | Cap at 4, using user's sort order |

---

## 9. Out of Scope / Future Phases

- **Phase 9+:** Event Flyer project type
- **Phase 9+:** Custom color themes for EPK slides
- **Phase 9+:** Adding an audio clip or Spotify preview link to the EPK
- **Phase 9+:** Sharing EPK as a public link via the MusicPromo artist profile
