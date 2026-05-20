# Song Press Kit — Phase 8 Requirements

## Doc Metadata

- Phase: 8
- Feature: Song Press Kit
- Doc owner: Nick
- Created: 2026-05-07
- Last updated: 2026-05-18
- Status: Implemented (branch `phase-8`)
- GitHub issue: #24

---

## 1. Summary

Phase 8 introduces the **Song Press Kit (SPK)** as a second project type alongside Music Promo video. An SPK is a **4-slide Instagram carousel** (4:5 portrait) — Cover, Track Details, Vision, and Artist Bio — exported as JPEG images.

The create tab shows a **project type picker** (Music Promo vs Song Press Kit). The SPK flow is a **4-step wizard** with draft persistence (Convex for signed-in users, local storage for guests), background customization on preview, and export to the device photo library.

---

## 2. Goals

- Let artists generate a shareable press kit carousel in the same app they use for promo videos
- Add a project type picker as infrastructure for future project types
- Keep the flow simple: artwork + copy in a few screens, preview, export
- Persist SPK projects so users can exit mid-flow, resume from home, and re-export

---

## 3. Non-Goals

- Per-slide typography or layout controls (fonts, positions) — fixed editorial slide components
- Audio trimming or video rendering for SPK projects
- Web or desktop support
- Cloud storage for SPK artwork URIs — media stays on-device (same as video flow)
- Exporting all four slides through the system share sheet in one action (share opens with the cover slide only; all four are saved to the camera roll on export)

---

## 4. User Stories

### 4.1 Project type picker

> As an artist, when I tap the Create tab I want to choose what kind of project I'm making so the right flow launches.

**Acceptance criteria:**
- Create tab shows two cards: **Music Promo** and **Song Press Kit** (`create/type-picker.tsx`, embedded in `(tabs)/create.tsx`)
- Music Promo → existing `picker → editor → rendering → share` flow (unchanged)
- Song Press Kit → `create/spk/details` (step 1 of 4)
- Close/back dismisses without creating a project

### 4.2 Step 1 — Artwork, artist, and title (`details`)

> As an artist, I want to start a press kit with my track artwork and title, optionally linked to an existing Music Promo project.

**Acceptance criteria:**
- Screen title: **New Song Press Kit**, step label **1 of 4**
- **Artist name** text field; pre-filled from profile when empty; user edits override profile default
- **Track artwork** via photo library picker
- **Link to existing Music Promo** opens a project list; selecting one pre-fills `photoUri`, `title`, `linkedProjectId`, `templateName`, `clipDurationSec`
- User can unlink and pick fresh artwork
- **Track title** text field
- Cannot advance without **both** artwork and a non-empty title
- **Next** advances to Vision
- Flow header: back (within wizard), exit (saves draft and leaves — see §4.8)

### 4.3 Step 2 — Vision / concept (`vision`)

> As an artist, I want to write the vision or concept behind my track for the carousel.

**Acceptance criteria:**
- Step label **2 of 4**; track summary strip (artwork + title + artist)
- Tip card with writing guidance
- **Vision / Concept** multiline input; placeholder: *What's the story behind this track?*
- **280-character** limit with live counter (warns when ≤30 remaining)
- **Required** to advance — empty vision disables **Next**
- **Next** advances to Track Details

### 4.4 Step 3 — Track metadata (`metadata`)

> As an artist, I want to add optional release metadata that appears on the Track Details slide.

**Acceptance criteria:**
- Step label **3 of 4**; track summary strip
- Hint: *All fields are optional — fill in what's relevant for this release.*
- Fields:
  - **Genre** (text, max 50)
  - **BPM** (numeric, max 3 digits, number pad on iOS)
  - **Release date** (native date picker modal; clearable)
  - **Label** (text, max 60)
  - **Collaborators** (text, max 100)
- **Keyboard (iOS):** dark **Done** toolbar above the keyboard (`KeyboardDismissAccessory`); footer **Next** hidden while keyboard is open; Return key moves between text fields where applicable
- **Next** advances to Preview

### 4.5 Step 4 — Preview, customize, and export (`preview`)

> As an artist, I want to preview all four slides, adjust backgrounds, and export the carousel.

**Acceptance criteria:**
- Step label shows current slide name (**Cover**, **Track Details**, **Vision**, **Bio**) or **Exported** after a successful export in this session
- Horizontal **paged carousel** (one slide full width); dot pagination for 4 slides
- **Background studio** (below carousel, before export):
  - Separate **cover** image slot and **inner slides (2–4)** image slot
  - Quick actions: match cover to inner, color-only inner, reset cover to track artwork
  - **Photo-matched** swatches from artwork + **editorial color presets** (Midnight, Navy, Forest, Bordeaux, Espresso)
  - Custom color via shared palette UI (same system as Music Promo editor backgrounds)
- If profile **bio** or **social links** are missing, inline nudge with shortcut to Profile
- **Export Carousel** captures all 4 slides via `react-native-view-shot`, saves JPEGs to **Camera Roll**, persists project as `exported`
- Post-export panel: success message, **Share** (system share sheet with cover slide), **Done** (home)
- Re-opening an exported project from home lands on preview; user can re-export without the pre-export edit nudge
- Flow header back returns to metadata when not in post-export state

### 4.6 Export

> As an artist, I want exported slides saved and easy to share.

**Acceptance criteria:**
- Each slide captured at device width × **4:5** height (`SPK_SLIDE_WIDTH` × `SPK_SLIDE_HEIGHT`), JPEG quality ~0.93
- All **four** images saved to the photo library on export
- Filenames include project title and slide identifier
- Export completes in reasonable time on mid-tier devices (target &lt;10s)
- Signed-in: Convex project `status: "exported"`, `spkStep: "preview"`
- Guest: local AsyncStorage project with `status: "exported"`

### 4.7 Project history

> As an artist, I want SPK projects in my project list so I can resume or re-export.

**Acceptance criteria:**
- SPK projects appear on **Home** alongside video projects
- Card subtitle: **Song Press Kit** (draft: **Song Press Kit · Draft**); thumbnail uses track artwork
- Tap opens at saved `spkStep` (exported projects always open at **preview**)
- Draft auto-saves on exit from any wizard step when there is draft content

### 4.8 Draft persistence

> As an artist, I should not lose work if I leave mid-flow.

**Acceptance criteria:**
- In-flow state held in `SpkDraftProvider` (`mergeDraft` on field change)
- Exit / save-and-exit flushes to Convex (`saveSpkDraftToConvex`) or local (`saveSpkDraftLocally`) via `useSpkClose`
- `spkStep` records last wizard step for resume
- Route params hydrate draft when navigating back/forward; opening from home uses stored project record

---

## 5. Slide Designs

All slides: **4:5 portrait** (Instagram carousel), dark editorial theme, white/off-white type. Inner slides (2–4) share `themeColor` and optional `innerBackgroundUri` (photo or solid). Cover uses `customCoverUri` or track artwork.

### Slide 1 — Cover

```
[Full-bleed cover image — custom cover or track artwork]
[Light overlay + bottom gradient]
[Bottom] Track title (large, bold)
```

**Data:** `customCoverUri` ?? `photoUri`, `title`

### Slide 2 — Track Details

```
[Background: theme color and/or inner background photo]
[Top] "TRACK DETAILS" (small caps)
[Middle] Track title (large)
[Meta grid] Genre + BPM (side by side when present)
[Stack] Released date, Label, Collaborators (as available)
```

**Data:** `title`, `genre`, `bpm`, `releaseDate` (formatted label), `label`, `collaborators`, `themeColor`, `innerBackgroundUri`

*Note: Linked Music Promo `templateName` / `clipDurationSec` are stored on the project but not shown on this slide in v1.*

### Slide 3 — Vision

```
[Background: theme color and/or inner background photo]
[Top] "VISION" (small caps)
[Middle] Vision text, large quote style
[Bottom-right] Artist name (attribution)
```

**Data:** `vision`, `artistName` (from SPK draft, not only profile), `themeColor`, `innerBackgroundUri`

### Slide 4 — Artist Bio

```
[Background: theme color and/or inner background photo]
[Top] Avatar (if available) + artist name
[Middle] Bio text
[Bottom] Social platform icons / links (profile)
```

**Data:** Profile `artistName`, `avatarImageUrl`, `bio`, `links` (guest: local profile)

---

## 6. Data Model

### `projects` table (Convex) and local projects

| Field | Type | Notes |
|-------|------|--------|
| `type` | `"video"` \| `"spk"` | Optional; missing = video |
| `aspectRatio` | `"4:5"` for SPK | Stored on create |
| `status` | `"draft"` \| `"exported"` | |
| `spkStep` | `"details"` \| `"vision"` \| `"metadata"` \| `"preview"` | Resume pointer |
| `title` | string? | Track title |
| `photoUri`, `photoName` | string? | Track artwork |
| `artistName` | string? | SPK-specific override |
| `vision` | string? | |
| `genre`, `bpm`, `label`, `collaborators` | string? | Metadata |
| `releaseDate` | string? | ISO date `YYYY-MM-DD` |
| `themeColor` | string? | Hex, inner slide fill |
| `customCoverUri` | string? | Optional cover override |
| `innerBackgroundUri` | string? | Slides 2–4 photo background |
| `linkedProjectId` | string? | Source Music Promo project |
| `templateName`, `clipDurationSec` | string? / number? | From linked promo |

Existing records without `type` are treated as `"video"` at read time.

---

## 7. Navigation / Route Structure

```
(tabs)/create.tsx              → TypePickerScreen (embedded)
create/type-picker.tsx         → Music Promo | Song Press Kit cards
create/spk/_layout.tsx         → SpkDraftProvider + stack
  create/spk/details.tsx       → Step 1: artwork, artist, title
  create/spk/vision.tsx        → Step 2: vision
  create/spk/metadata.tsx      → Step 3: track metadata
  create/spk/preview.tsx       → Step 4: preview + export
```

Music Promo flow unchanged: `create/picker → editor → rendering → share`.

**Key modules:** `src/lib/spkDraft.ts`, `src/providers/SpkDraftContext.tsx`, `src/hooks/useSpkClose.ts`, `src/hooks/useSpkWizardBack.ts`, `src/components/spk/*`.

---

## 8. Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Slide preview layout? | Horizontal paged carousel with dot pagination |
| 2 | Vision slide typography? | Large quote-style body text |
| 3 | Missing profile bio/links? | Inline nudge on preview with link to Profile |
| 4 | Artwork / URIs in cloud? | On-device only |
| 5 | Carousel aspect ratio? | **4:5** portrait (Instagram), not 1:1 |
| 6 | How many wizard steps? | **4** (details → vision → metadata → preview) |
| 7 | Track metadata required? | **No** — all metadata fields optional |
| 8 | Background customization? | **Yes** on preview — cover/inner images + color presets (aligned with Music Promo background system) |
| 9 | Artist name on cover slide? | **No** in v1 — title only; artist on Vision + Bio |
| 10 | Social icons on cover? | **No** in v1 — links on Bio slide only |
| 11 | BPM keyboard dismiss (iOS)? | `InputAccessoryView` Done bar; hide footer Next while keyboard open |
| 12 | Share after export? | Share sheet for **cover** slide; all four in Camera Roll |

---

## 9. Out of Scope / Future Phases

- Event Flyer project type
- Per-slide font / layout editor
- Artist name and social row on Cover slide
- Showing linked promo template / clip length on Track Details slide
- Single share action attaching all four JPEGs
- Public press kit link on artist profile
- Spotify / audio preview on press kit slides
