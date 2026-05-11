# Music Player Overlay — Phase 9 Requirements

## Doc Metadata

- Phase: 9
- Feature: Music Player Overlay
- Doc owner: Nick
- Created: 2026-05-10
- Status: Draft
- GitHub issue: TBD

---

## 1. Summary

Phase 9 introduces a **Music Player Overlay** as the first entry in a new Overlays system in the editor. When a user activates the overlay, their Music Promo video is replaced visually by a full-fidelity mock of a music streaming player — but the audio from their project is preserved and drives the animated progress bar. The existing template system, audio trimming, and export pipeline are otherwise unchanged.

This is not a new template. It is a compositing layer. The template the user selects provides the audio clip and project metadata; the overlay controls what is rendered on screen at export time.

*Design inspiration: `docs/design-inspiration/Video Templates screens/` — Spotify mobile player used as visual reference only. The product UI is generic and does not reference Spotify by name.*

---

## 2. Goals

- Let artists make their track look like it is streaming on a major music platform
- Introduce Overlays as an extensible editor concept alongside Templates
- Keep the create flow identical — Overlays are configured inside the editor, not at the type picker
- Preserve all existing audio trimming and project management functionality

---

## 3. Non-Goals

- No actual streaming platform integration, API calls, or third-party data
- No use of any streaming service's trademarked name, logo, or wordmark in the rendered output
- No changes to the template picker or the existing Music Promo rendering pipeline when no overlay is active
- No web or desktop support
- No per-overlay analytics events in this phase (can be added later)
- No second overlay type in this phase (architecture should allow it; implementation ships one)

---

## 4. Architecture Decision

The Music Player overlay is a **rendering mode switch**, not a template replacement.

When `overlay.type === "musicPlayer"`:
- The selected template is **not rendered** — no spinning vinyl, no video compositing, no template work
- The audio clip from the project **is rendered** as normal
- The export output is the Music Player UI composited with the audio

When no overlay is active:
- The pipeline is entirely unchanged — templates render as they always have

This means the user still goes through the template picker (for audio trimming and project setup), but the template visual is bypassed at render time if an overlay is active.

---

## 5. User Stories

### 5.1 Overlay section in editor

> As an artist, I want to see an Overlays section in the editor so I know the option exists and where to find it.

**Acceptance criteria:**
- The editor screen has a new collapsible or scrollable section labeled "Overlays" (placement TBD with design)
- The section shows one option: "Music Player"
- Selecting it activates the overlay and expands the overlay settings panel contextually
- Deselecting it returns the preview to the standard template view and collapses the settings panel
- The overlay toggle state persists with the project (saved to Convex)

### 5.2 Overlay settings — Music Player

> As an artist, I want to configure my Music Player overlay so the song info and visuals are correct.

**Acceptance criteria:**
- Song title: pre-filled from `project.title`, editable inline
- Artist name: pre-filled from `user.artistName`, editable inline
- Progress bar animation: toggle on/off (default: on)
- Background mode: two options — **Album Art** (default) and **Upload a Clip**
  - Album Art: uses `project.photoUri` as the artwork square inside the player (screen 0 reference)
  - Upload a Clip: opens a video picker limited to 8 seconds; clip plays full-bleed behind the player UI (screen 1 reference)
- Settings are hidden until the overlay is selected (contextually revealed)
- Settings are saved to Convex as part of the project

### 5.3 Album Art mode (static)

> As an artist, I want my album art to appear inside the Music Player UI so it looks like my track is queued on a streaming platform.

**Acceptance criteria:**
- The Music Player UI renders with the album artwork in the large square artwork area
- All player chrome is present: status bar mock, radio station / playlist name at top, song title, artist name, progress bar with timestamps, shuffle/skip/play/skip/repeat controls, MusicPromo wordmark at bottom
- The progress bar is animated if animation is toggled on — it advances from 0:00 to the clip length over the duration of the export
- The rendered output is portrait (9:16), matching the standard Music Promo export format

### 5.4 Canvas mode (video clip)

> As an artist, I want to upload a short video clip so it plays behind the Music Player UI.

**Acceptance criteria:**
- The uploaded clip plays full-bleed (edge to edge, 9:16) behind the Music Player UI
- The player chrome floats over the video: song title, artist name, progress bar, controls, MusicPromo wordmark
- Album artwork thumbnail (small, circular or square) appears next to the song title in the overlay (matching screen 1 reference)
- Clip loops continuously for the duration of the export if shorter than the audio clip
- If the clip is longer than 8 seconds, it is trimmed at import to 8 seconds
- The progress bar animates if animation is toggled on

### 5.5 Rendering pipeline — overlay mode

> As an engineer, I want the renderer to skip the template entirely when an overlay is active so we don't waste render time on visuals that won't be in the output.

**Acceptance criteria:**
- `rendering.tsx` checks for `project.overlay.type` before starting template render
- If `overlay.type === "musicPlayer"`, the template render step is skipped entirely
- Audio is extracted and rendered normally regardless of overlay state
- The Music Player UI is rendered as the visual layer using `react-native-view-shot` or the existing render mechanism
- Export output format and resolution are unchanged (same as standard Music Promo export)

### 5.6 Project persistence

> As an artist, I want my overlay settings saved so I can re-open the project and re-export without reconfiguring.

**Acceptance criteria:**
- All overlay settings (type, song title override, artist name override, animation toggle, background mode, uploaded clip URI) are saved to Convex on export
- Re-opening the project in the editor restores the overlay state and settings
- Uploaded clip URI is stored on-device only (same policy as project artwork)

---

## 6. Music Player UI Spec

### Visual reference
`docs/design-inspiration/Video Templates screens/` — screens 0 and 1. Used as layout and aesthetic reference only. No streaming platform branding, wordmarks, or logos appear in the rendered output.

### Shared chrome (both modes)

| Element | Detail |
|---|---|
| Status bar | Mocked: `9:41`, signal bars, WiFi, battery — static |
| Top nav | Down chevron (left), playlist/radio name (center), `···` menu (right) |
| Song title | Large, white, left-aligned |
| Artist name | Medium, muted white, left-aligned |
| `×` and `+` buttons | Right of song/artist block |
| Progress bar | Full width; left timestamp `0:00`, right timestamp clip length; scrubber dot animates if enabled |
| Controls row | Shuffle, skip back, play/pause, skip forward, repeat — centered |
| Secondary controls | Cast (left), share, queue (right of controls row) |
| MusicPromo wordmark | Bottom-left — MusicPromo logo + wordmark |

### Album Art mode additions (screen 0)
- Large square artwork area (album art from `project.photoUri`)
- `Switch to video` button — **omit**

### Canvas mode additions (screen 1)
- Full-bleed video behind all chrome
- Small circular/square album thumbnail left of song title

---

## 7. Data Model Changes

### projects table

Add one optional field:

```ts
overlay: v.optional(v.object({
  type: v.literal("musicPlayer"),
  songTitleOverride: v.optional(v.string()),
  artistNameOverride: v.optional(v.string()),
  progressAnimation: v.optional(v.boolean()),
  backgroundMode: v.optional(v.union(v.literal("albumArt"), v.literal("clip"))),
  clipUri: v.optional(v.string()),
})),
```

- Existing records without `overlay` behave identically to today
- `overlay` is `undefined` when no overlay is active — no default value needed

---

## 8. UI Placement (To Be Decided with Design)

The Overlays section in the editor needs a placement decision. Options:

| Option | Tradeoff |
|---|---|
| New horizontal scroll section below Templates | Consistent with existing editor layout; easy to discover |
| Collapsible accordion below audio controls | Keeps screen clean; less discoverable |
| Separate "Overlays" tab in editor bottom sheet | Cleanest separation; requires tab UI |

Design should decide. The settings panel for the active overlay is always revealed contextually — only visible after the user selects an overlay type.

---

## 9. Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | Is Music Player a template or an overlay? | Overlay — composited on top of the existing pipeline, not a replacement template |
| 2 | Does the template render when overlay is active? | No — template render is skipped; audio is preserved |
| 3 | What is the background in album art mode? | `project.photoUri` (the project's album artwork) |
| 4 | What is the background in canvas mode? | User-uploaded clip, max 8 seconds, plays full-bleed looping |
| 5 | Does the progress bar animate? | Yes, by default; can be toggled off in overlay settings |
| 6 | Is "Switch to video" included in the mock UI? | No — omitted |
| 7 | Is artwork stored to cloud? | On-device only, same policy as existing project artwork |
| 8 | Can the user override song title / artist name? | Yes — pre-filled from project/profile but editable in overlay settings |
| 9 | Does the output reference any streaming platform by name or logo? | No — MusicPromo wordmark replaces any platform branding |

---

## 10. Out of Scope / Future Phases

- **Future:** Additional overlay types (lock screen widget, social handle ticker, label watermark)
- **Future:** Custom Music Player color themes
- **Future:** Animated waveform bar in place of the standard progress bar
- **Future:** Cloud storage for uploaded canvas clips
