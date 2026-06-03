# Show Flyer — Requirements

## Doc Metadata

- Feature: Show Flyer (Event Flyer)
- Doc owner: Nick
- Created: 2026-05-19
- Last updated: 2026-05-19
- Status: In progress (editor + templates implemented; export parity ongoing)
- Related design assets: `docs/design-assets/flyer-workflow/`
- Implementation: `app/create/flyer/`, `src/components/flyer/`, `src/lib/flyerDraft.ts`, `src/lib/flyerTemplates.ts`

---

## 1. Summary

The **Show Flyer** is a third project type in the Create tab. Artists enter event details (name, date, time, venue), pick one of three templates (**Heat**, **Iridescent**, **Vintage**), customize text/lineup/colors/photo/audio, and export as a **static image** or a **short video** (when audio is attached).

The flow is a **3-step wizard**: Details → Editor → Export. Draft state persists to Convex (signed-in) or local storage (guest).

---

## 2. Goals

- Let artists announce individual shows with polished, template-driven flyers in under a few minutes
- Support **multiple performers** with dynamic lineup layouts (grid, column, festival, spotlight)
- Keep editing constrained: curated templates, not a free-form design tool
- Match reference flyer aesthetics (texture, halftone, display type, script accents)
- Export for Instagram posts (4:5) and Stories/Reels (9:16)

---

## 3. Non-Goals

- Free-form layout editor (drag/drop zones, font store, color picker)
- Template marketplace or user-authored templates
- Shows database / venue lookup integration
- Tight coupling to Music Promo projects (audio/photo may be shared manually; no auto-link in v1)
- Web or desktop export targets
- Animated/moving flyer elements beyond static image + optional audio video export (future)
- Editable template chrome in v1: Heat badge, Iridescent genres line, Iridescent age stamp (see §8)

---

## 4. User Stories

### 4.1 Project type picker

> As an artist, I want to start a Show Flyer from the Create tab.

**Acceptance criteria:**
- Create tab includes **Show Flyer** alongside Music Promo and Song Press Kit
- Show Flyer → `create/flyer/details` (step 1 of 3)
- Flow uses dark editor/export theme; details step uses adaptive light/dark like other create flows

### 4.2 Step 1 — Event details (`details`)

> As an artist, I want to enter the core show information before designing the flyer.

**Acceptance criteria:**
- Step label **1 of 3**
- Required: **event name**, **date**, **start time**, **venue**
- Optional: **end time**, **city**, **photo**, **audio**
- Cannot advance without required fields
- **Next** advances to Editor; seeds default lineup JSON if none exists
- Exit saves draft when content exists

### 4.3 Step 2 — Editor (`editor`)

> As an artist, I want to pick a template and customize the flyer while seeing a live preview.

**Acceptance criteria:**
- Step label **2 of 3**
- **Preview** always renders at **4:5**, scaled to fit editor width (see §6 Preview vs export)
- **Template rail**: Heat · Iridescent · Vintage — switches background preset; Heat-only accent swatches on Colors tab
- **Tabs:**
  - **Text** — eyebrow (label varies by template), subtitle, event name, tagline, lineup editor
  - **Colors** — background presets; accent swatches (Heat only)
  - **Photo** — add/replace/remove custom background photo
  - **Audio** — add/trim 3–30s clip for video export
- Text changes and lineup layout changes reflect in preview **immediately** on all templates
- **Export** button advances to export step (saves draft)

### 4.4 Step 3 — Export (`export`)

> As an artist, I want to choose output format and aspect ratio, then save or share.

**Acceptance criteria:**
- Step label **3 of 3**
- **Aspect ratio** picker lives here only (**9:16** or **4:5**) — not in editor
- Formats: **image** (JPEG/PNG capture) and **video** (when audio present; ~10–30s)
- Preview on export screen respects chosen aspect ratio (still scaled for display)
- Capture at device-width export resolution; JPEG quality ~0.93
- Saves to camera roll; persists project as `exported`

### 4.5 Lineup

> As an artist, I want to list performers and choose how they appear on the flyer.

**Acceptance criteria:**
- 0–10 performers; empty lineup omits the lineup block entirely
- Per performer: name, optional set time, optional headliner flag (at most one)
- **Show set times** toggle (Text tab)
- **Intro label** presets: SOUNDS BY, MUSIC BY, DJ SET BY, FEATURING, WITH, or custom
- **Layout** override (when 2+ performers): Grid · Column · Festival · Spotlight
- Auto-suggested layout from count: 2–4 → grid, 5–8 → column, 9–10 → festival; user override always wins
- Headliner is optional — users can imply hierarchy via set times only
- Shared `FlyerLineupBlock` renders on all templates; templates supply colors/fonts only

### 4.6 Draft persistence

> As an artist, I should not lose flyer work if I leave mid-flow.

**Acceptance criteria:**
- `FlyerDraftProvider` holds in-flow state
- Route params + Convex/local project store: `flyerEyebrow`, `flyerSubtitle`, `flyerTagline`, `flyerLineupJson`, `flyerTemplateId`, `flyerBackgroundKey`, `flyerAccentColor`, `flyerStep`, etc.
- Resume from home opens at saved `flyerStep` (exported → editor)

---

## 5. Templates & Slot Map

All three templates share the same **vertical skeleton**: top label → centered title block → optional subtitle → lineup → secondary line → footer. Footer pinned to bottom; title block vertically centered in remaining space.

| Slot | Draft field | Heat | Iridescent | Vintage |
|------|-------------|------|------------|---------|
| Top label | `eyebrow` | Eyebrow (accent, caps) | Presenter (caps) | Overline (Pinyon Script, italic) |
| Title | `eventName` | Anton display word + Caveat script remainder | Bebas `titleA` + `titleB` stacked | Anton stacked (`titleA` / `titleB`) |
| Event subtitle | `flyerSubtitle` | Optional — medium Inter, white, below title stack | Optional — medium Inter, black | Optional — medium Inter, dark |
| Tagline / genres | `tagline` | Accent genre line below subtitle | — | Uppercase genre line below lineup |
| Lineup | `lineup` | `FlyerLineupBlock` | `FlyerLineupBlock` | `FlyerLineupBlock` |
| Template chrome | — | Badge (static v1) | Genres + age (static v1) | — |
| Footer | date/time/venue | Pipe-separated, hairline rule | Age + time + date / venue | Date · venue · time |

**Eyebrow defaults** (when field empty):

| Template | Default | Editor label |
|----------|---------|--------------|
| Heat | `ROOFTOP DAY PARTY` | Eyebrow |
| Iridescent | `JAXX EVENTS & HIGHLAND PRESENT` | Presenter |
| Vintage | `thursday` | Overline |

**Tagline default:** `house / disco / grooves` (Heat accent, Vintage footer uppercase)

**Subtitle:** no default — omit slot when `flyerSubtitle` is empty on all templates

---

## 6. Preview vs Export

| Context | Aspect ratio | Sizing |
|---------|--------------|--------|
| Editor preview | **Always 4:5** | Renders at full export pixel size, scaled down via transform (`FlyerPreviewFrame`) |
| Export preview | User-selected **9:16** or **4:5** | Same capture pipeline as final export |
| Export file | User-selected **9:16** or **4:5** | Device width × ratio height |

**Typography scale:**
- Global content scale: `FLYER_CONTENT_SCALE = 1.2`
- Extra 4:5 boost: `FLYER_COMPACT_SCALE_BOOST = 1.28` (primary post ratio)

---

## 7. Lineup Layout Rules

Implemented in `FlyerLineupBlock`. Layout choice from editor must be honored on **every** template (never hardcode per template).

### Grid
- Full content width; two columns with `space-between`
- Left column: left-aligned names/times; right column: right-aligned
- Each column max ~48% width

### Column
- Vertical stack; name + set time per row

### Festival
- Horizontal rows with hairline dividers; name + time

### Spotlight
- Bordered pill; all names on **one row** (no wrap)
- Each name is its own `Text` node in a horizontal `flexWrap: "nowrap"` row — do not join names into one string (iOS wraps at spaces)
- **Iridescent:** square separators; Bebas Neue condensed font
- **Heat / Vintage:** `×` separators; Bebas condensed when 4+ names (Anton too wide); Anton OK for 1–3 names
- Font size is **density-aware** (4+ names use smaller base sizes) and **template-aware**
- iOS: extra `lineHeight` (~1.25×) and vertical padding so glyphs stay inside pill border

### Headliner
- Optional; at most one; renders larger in display font when layout supports it (not in spotlight pill)

---

## 8. Static Template Chrome (v1)

These render fixed copy until a future phase makes them editable:

| Template | Element | Current value |
|----------|---------|---------------|
| Heat | Corner badge | `HAPPY HOUR · 4-7PM` |
| Iridescent | Genres line | `HOUSE / TECHNO / DISCO / GHETTOTECH` |
| Iridescent | Age stamp | `18+` |

---

## 9. Native Text Rendering (iOS)

Acceptance criteria for all templates — verify on **physical iOS device**, not web-only:

| Issue | Mitigation |
|-------|------------|
| Anton ascenders clipped | `lineHeight ≥ 1.2×` font size; iOS-only `paddingTop` on title block/text |
| Heat display title top clipped | `flyerStackedTitleLineHeight`; `flexShrink: 0` on title group |
| Caveat script under display title | Wrapper with `minHeight`; avoid tight `lineHeight` on script face |
| Vintage stacked title | Single `Text` with `\n`; use `titleA`/`titleB` from template data, not re-split |
| Spotlight pill overflow | Condensed font + density sizing; iOS padding; per-name `Text` nodes |

Helpers: `flyerTitleLineHeight`, `flyerStackedTitleLineHeight`, `flyerScriptLineHeight` in `src/lib/flyerLayout.ts`.

---

## 10. Data Model

### Draft input (`FlyerDraftInput`)

| Field | Required | Notes |
|-------|----------|-------|
| `eventName` | yes | Split per template (see §5) |
| `eventDate` | yes | ISO; rendered abbreviated uppercase |
| `eventTime` | yes | Start time |
| `eventEndTime` | opt | End time or `LATE` |
| `venue` | yes | |
| `city` | opt | Vintage: separate city line under venue |
| `eyebrow` | opt | Maps to presenter/overline; template default when empty |
| `flyerSubtitle` | opt | Event subtitle; hidden when empty on all templates |
| `tagline` | opt | Heat accent / Vintage footer — **not** subtitle |
| `lineupJson` | opt | Serialized `FlyerLineup` |
| `templateId` | opt | `heat` \| `iridescent` \| `vintage` |
| `backgroundKey` | opt | Preset id per template |
| `accentColor` | opt | Heat only |
| `aspectRatio` | opt | Export target; preview always 4:5 |
| `photoUri`, `audioUri` | opt | |
| `trimStart`, `trimEnd` | opt | Audio clip for video export |
| `flyerStep` | opt | `details` \| `editor` \| `export` |

### Convex / local `projects` (flyer-specific)

| Field | Notes |
|-------|-------|
| `type` | `"flyer"` |
| `flyerEyebrow` | |
| `flyerSubtitle` | |
| `flyerTagline` | |
| `flyerLineupJson` | |
| `flyerTemplateId` | |
| `flyerBackgroundKey` | |
| `flyerAccentColor` | |
| `flyerExportFormat` | `video` \| `image` |
| `flyerStep` | Resume pointer |

---

## 11. Navigation

```
create/flyer/_layout.tsx       → FlyerDraftProvider + stack
  create/flyer/details.tsx     → Step 1: event details
  create/flyer/editor.tsx      → Step 2: template + tabs
  create/flyer/export.tsx      → Step 3: format + aspect ratio + capture
```

**Key modules:** `src/lib/flyerDraft.ts`, `src/lib/flyerTemplates.ts`, `src/lib/flyerLineup.ts`, `src/lib/flyerLayout.ts`, `src/lib/flyerDimensions.ts`, `src/components/flyer/*`, `src/providers/FlyerDraftContext.tsx`.

**Shared components:** `FlyerLineupBlock`, `FlyerEventSubtitle`, `FlyerPreviewFrame`, `FlyerTemplateView`.

---

## 12. Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Editor preview aspect ratio? | **Always 4:5**; export ratio chosen on export screen only |
| 2 | Subtitle vs tagline? | **Separate fields** — `flyerSubtitle` (optional, all templates) vs `tagline` (template-specific secondary line) |
| 3 | Eyebrow across templates? | **One draft field** (`eyebrow`); template-specific label + default |
| 4 | Lineup layout control? | User override in Text tab; must apply on all templates |
| 5 | Spotlight 4 names on one row? | Horizontal flex row, condensed font, density sizing; verified on iOS |
| 6 | Grid column alignment? | Full-width `space-between`; outer edges aligned |
| 7 | Headliner required? | **No** — optional; set times can imply order |
| 8 | Photo on flyer? | Replaces gradient background with overlay for legibility |
| 9 | Audio on flyer? | Optional; trimmed clip → video export only |
| 10 | iOS text clipping? | Explicit line-height + padding rules; device QA required |

---

## 13. Out of Scope / Future

- Editable badge, genres, and age stamp
- Photo overlay opacity slider in editor
- Moving/GIF flyer elements
- Linking flyer to Music Promo project for auto-fill
- Lineup block vertical position (top-heavy vs bottom-heavy compositions)
- Share-sheet shortcuts beyond camera roll save
