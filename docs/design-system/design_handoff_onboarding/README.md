# Handoff: MusicPromo Onboarding Wizard (v1 — Music Promo only)

## Overview
A 6-step first-run onboarding wizard for the MusicPromo app (React Native / Expo, **light theme only**). It introduces the value prop, explains the 3-step flow, primes two OS permissions (Photos, Audio), captures the artist profile with a **live ShareCardPreview**, and ends on a ready/finish screen. v1 scope is **Music Promo only** — no SPK / Flyer variants.

## About the Design Files
The files in this bundle are **design references built in HTML/React + Babel** — a runnable prototype that shows the intended look, copy, and behavior. **They are not production code to paste in.** The task is to **recreate these screens in the real RN/Expo app** using its existing primitives (`src/components/onboarding/`, `ShareCardPreview`, the Profile hero, navigation, and the real `constants/tokens`). Where this doc and the live app's source-of-truth tokens disagree, **the app's tokens win** (see Design Tokens caveat below).

Open `MusicPromo Onboarding.html` in a browser to interact with the prototype. A **Tweaks** panel (top-right) toggles CTA color, header progress style (counter / dots / bar), the Skip button, and a "jump to step" review aid — these are review affordances, **not** product features to ship.

## Fidelity
**High-fidelity.** Final layout, spacing, type ramp, interaction model, and copy are all intended as-built. Recreate pixel-closely using the codebase's components. Two known placeholders to replace with real assets/values:
- **Imagery** (banner, avatar photo, promo thumbs) renders as a diagonal-stripe `StripeFill` placeholder. Replace with real image pickers / `MusicPromo-Banner.png` default.
- **Design tokens** here were reverse-engineered from call sites (see caveat). Swap in `src/constants/tokens.ts`.

---

## Screens / Views
The wizard is a fixed vertical stack: **header (back · progress · Skip)** → **scrolling body** → **sticky footer CTA**. Only the body changes per step; chrome is owned by the shell (`onboarding-app.jsx` → `Onboarding`). iOS push transition between steps (`mp-in-right` / `mp-in-left`, 300ms `cubic-bezier(0.32,0.08,0.24,1)`).

Device frame in the prototype is a 393×852 iPhone (`ios-frame.jsx`); in-app this is just the screen.

### Shared chrome
- **Header**: 3-col grid `40px 1fr 40px`, `padding: 56px 16px 8px`. Left = back chevron (circular 36px button, `--surface` + 1px `--border`), shown from step 2+. Center = progress (default **counter** "N of 6"). Right = **Skip** text button (`--fg-secondary`, 15/600), hidden on the last step.
- **Footer**: sticky, `padding: 12px 24px calc(24px + safe-area)`, with a `linear-gradient(to top, --bg 72%, transparent)` fade. Optional **secondary** text button above the primary. **Primary CTA**: full-width, height 54, `--radius-md`, **black fill `#11131A`**, white 16/700 label, **scale-on-press** (`.press` → `transform: scale(0.97)`). Disabled state = `opacity 0.32`, `not-allowed`.

### Step 1 — Value (`StepValue`)
- **Purpose**: hook the user with the core promise.
- **Layout**: `StepHead` (eyebrow + h1 + body) then a centered 176×312 9:16 phone-poster mock (`--radius 22`, dark `StripeFill`, "9:16" mono tag top-right, white 52px play button at 42% height, avatar + "Your name" pinned bottom).
- **Copy**: eyebrow **"Fast start"** · h1 **"Turn one photo and one track into a promo in seconds"** · body **"Drop in a photo, add an audio clip, and MusicPromo builds a vertical promo video. No editor to fight."**
- **CTA**: `Get started`.

### Step 2 — Flow (`StepFlow`)
- **Purpose**: set expectations — it's only 3 steps.
- **Layout**: `StepHead` then a single card (`--surface`, 1px `--border`, `--radius-lg`, inner `padding 0 16px`) holding 3 `FlowRow`s separated by 1px `--border` (last row no border). Each row: 46px `--surface-muted` rounded tile with a Lucide icon + a 18px numbered badge (`--fg` bg, `--bg` text), then title (16/600) + body (13/`--fg-secondary`).
- **Copy**: eyebrow **"Simple flow"** · h1 **"Three steps, then you're done"** · rows: **1 Pick a photo** "Choose any shot from your library." · **2 Pick a track** "Add an audio clip and trim the loop." · **3 Share it** "Post it, or save to your Camera Roll."
- **CTA**: `Continue`.

### Step 3 — Permission primer: Photos (`StepPermPhotos`)
- **Purpose**: explain *why* before the OS prompt.
- **Layout**: `StepHead` → `PermTile` (188px `--surface` card, centered 96px `--surface-muted` rounded square holding a 46px `Images` icon) → `HelperNote` (lock icon + reassurance, `--fg-secondary` 13/18).
- **Copy**: eyebrow **"Photo access"** · h1 **"Allow access to your photos"** · body **"MusicPromo opens your library so you can pick the image for your promo. You choose what to use."** · note **"Nothing leaves your phone until you share. You can change this later in Settings."**
- **CTAs**: secondary **"Not now"** (advances), primary **"Allow photo access"** → triggers faux iOS permission alert (see Interactions). Real app: call the actual `expo-image-picker` / `expo-media-library` permission request here.

### Step 4 — Permission primer: Audio (`StepPermAudio`)
- Same structure as step 3 with a 46px `Music` icon.
- **Copy**: eyebrow **"Audio access"** · h1 **"Allow access to your audio"** · body **"Pick a track from your music library and trim it to the perfect loop."** · note **"We only read the clip you choose. You can change this later in Settings."**
- **CTAs**: secondary **"Not now"**, primary **"Allow audio access"** → faux alert titled *""MusicPromo" Would Like to Access Apple Music"*.

### Step 5 — Profile setup (`StepProfile`) — interactive, the centerpiece
See **§ Profile-setup regions** below. Must mirror the **Profile tab hero + avatar overlap** and embed the **live ShareCardPreview**.
- **Copy**: h1 **"Set up your artist card"** · subtitle **"This shows on every promo you share. You can change it later."** · guest helper **"Sign in to link an existing Music Promo."**
- **CTAs**: secondary **"Skip for now"** (advances), primary **"Continue"** — **disabled until Artist name is non-empty**.

### Step 6 — Ready (`StepReady`)
- **Purpose**: confirmation / launch.
- **Layout**: centered column — 88px `--fg` circle with a 46px `Check`, eyebrow, h1, body (max-width 300).
- **Copy**: eyebrow **"You are set"** · h1 **"You're ready to make your first promo"** · body **"Tap the plus on Home anytime to start. Your first promo takes about a minute."**
- **CTA**: `Make my first promo` (+ trailing arrow) → finish overlay ("Opening MusicPromo…"), then routes into the app.

---

## § Profile-setup regions (top → bottom)
Mirrors `ONBOARDING_REQUIREMENTS.md §6`. All within a `padding: 0 24px` column.

1. **Wizard chrome** (shell-owned): step counter "5 of 6" + Skip.
2. **Title / subtitle / guest helper** — h1 27/32/-0.02em; subtitle 15/22 `--fg-secondary`; helper row = 15px `UserRound` icon + 13px `--fg-secondary` text.
3. **Hero banner** — tappable `button`, full-width **16:9** (`aspect-ratio: 16 / 9`), `--radius-lg`, 1px `--border`, `--surface-muted` bg, `StripeFill`. Tap toggles banner state (in-app: open banner picker; default art = **MusicPromo-Banner.png**). Bottom-right pill (`rgba(14,16,20,0.62)`, white 12/600, `Image` icon) reads **"Add banner"** / **"Change banner"**.
4. **Avatar** — circular 78px, **absolutely positioned to overlap the banner's bottom-left** (`left: 16, bottom: -30`), 3px `--bg` ring (`box-shadow: 0 0 0 3px var(--bg)`). Tap toggles photo (in-app: open photo picker). A caption button below (offset `margin-left: 106` to clear the overlap) reads **"Add photo"** / **"Change photo"** in `--accent-primary`.
5. **Artist name** — `Field` with uppercase label + **"Required"** counter; `input`, 16px, `--surface`, 1px `--border`, `--radius-md`, `padding 13px 14px`. Placeholder **"e.g. Midnight Drive"**. `aria-required`.
6. **Bio (optional)** — `Field` with **"{N} left"** counter (turns `--warning` when < 30 remain); `textarea` `maxLength = 280`, min-height 84, no resize. Placeholder **"What's your sound? A line or two about you."**
7. **Live ShareCardPreview** — eyebrow "Preview", centered, rendered at **`previewScale ≈ 0.55`** (`width = round(360 × 0.55) = 198`). Props in onboarding: `handles=[]`, `songs=[]`, `promos=[]`, `emptyPromos="Your promos will show here"`. Updates live as name/bio/photo/banner change.
8. **Footer** (shell): secondary **"Skip for now"** + primary **"Continue"** (disabled while name empty).

---

## § ShareCardPreview anatomy (`share-card.jsx`)
Dark export artifact, designed at a **native 360px width** and uniformly scaled to the `width` prop (`k = width/360`, all dimensions `× k`). Card: `#0E1014` bg, `--radius-lg`-ish (20·k), `overflow hidden`, soft shadow. **Always dark even though onboarding chrome is light.** Must match the production `src/components/ShareCardPreview.tsx`.

1. **Banner** — 16:9 (`height = 360×9/16 × k`), image or `StripeFill`, with a `linear-gradient(to bottom, transparent 40%, rgba(14,16,20,0.85))` overlay.
2. **Avatar + name row** — avatar (76·k, 3px card-color ring) **overlapping the banner** (`margin-top: -40·k`), name to its right in display sans 28·k/800/-0.02em. Placeholder name renders at 40% white.
3. **Bio** — 14·k/1.45, 66% white, clamped to 3 lines (only if present).
4. **Two columns** — **Socials** (left) / **Songs** (right), each an uppercase 10·k/700/0.16em label at 42% white; **empty state = "—"** in onboarding.
5. **Music Promos grid** — uppercase label + either a 3-col grid of 9:16 thumbs, **or** the empty state: dashed-border box (`rgba(255,255,255,0.16)`) with the `emptyPromos` message.
6. **Logo footer** — top hairline (`rgba(255,255,255,0.08)`), centered 6·k white dot + **"MUSICPROMO"** wordmark (11·k/700/0.18em, 55% white).

Helpers also exported: `StripeFill` (striped image placeholder, light/dark), `Avatar` (photo / camera-add / silhouette states), `SocialRow` (filled glyph chips; renders nothing when empty).

---

## Interactions & Behavior
- **Step transitions**: forward `mp-in-right`, back `mp-in-left`, 300ms `cubic-bezier(0.32,0.08,0.24,1)`. Body scrolls; header & footer are fixed.
- **Primary CTA press**: `.press` scales to `0.97` on `:active` (the "scale press" requirement). Black fill `#11131A`.
- **Primary CTA disabled**: only on Profile step, while `name.trim()` is empty → `opacity 0.32`, no press.
- **Permission steps**: primary opens a **faux iOS system alert** (`PermAlert`) — 272px blurred card, "Don't Allow" / allow buttons. Both paths advance in the prototype. **In-app, wire these to the real OS permission requests** and branch on grant/deny.
- **Secondary buttons** ("Not now", "Skip for now") advance to the next step. Header **"Skip"** jumps straight to the last step.
- **Finish**: last CTA shows `FinishOverlay` ("Opening MusicPromo…") for ~1.7s, clears persistence, then (in prototype) resets to step 0. In-app: navigate to Home.
- **Bio counter** flips to `--warning` (`#FF6B6B`) under 30 chars remaining; hard cap 280.

## State Management
Shell holds: `step` (int), `dir` (1/-1 for transition direction), `alert` (active permission alert data | null), `finished` (bool), and the shared `profile` object:
```
profile = { name: '', bio: '', handles: {}, photo: false, banner: false }
```
`photo` / `banner` are booleans in the prototype (placeholder toggle); in-app they become real asset URIs. `set(patch)` shallow-merges into `profile`. Step bodies receive `s` (profile) + `set`. **Persistence**: prototype writes `{ step, profile }` to `localStorage['mp_onb']` on change and clears it on finish — replace with your real onboarding-progress store / secure storage.

## Design Tokens
> ⚠️ **Caveat**: these were reverse-engineered from `app/` call sites because `constants/tokens.ts` wasn't attached. **Replace with the real token module** — treat the names below as the intended mapping, not authoritative values.

**Color (light / chrome)**: bg `#FBFAF7` · surface `#FFFFFF` · surface-muted `#F2F0EA` · text `#11131A` · text-secondary `#6B6F7A` · border `rgba(17,19,26,0.10)`.
**Color (dark / card)**: bg `#0E1014` · surface `#181B22` · surface-muted `#23262F` · text `#FFFFFF` · text-secondary `rgba(255,255,255,0.55)`.
**Accent**: primary `#3A5DFF` · **fill (CTA/FAB) `#11131A`** · on-fill `#FFFFFF`. **Semantic**: warning `#FF6B6B` · success `#1EA672` · destructive `#C62828`.
**Spacing**: xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48.
**Radius**: sm 8 · md 12 · lg 20 · full 9999.
**Type ramp**: h1 30/36/700/-0.02em · h2 22/28/700 · body 16/22/400 · button 16/20/700 · caption 12/16/500 · label 11/14/700/0.16em uppercase · display (heavy Inter) up to 88. Families: UI/display = Inter, mono = SF Mono stack.

## Assets
- **`fonts/Inter.ttf`** — variable Inter (UI + display). Use the app's bundled Inter instead if it ships one.
- **Icons** — [Lucide](https://lucide.dev) (`icon.jsx` wraps the UMD build). Names used: `ChevronLeft, ArrowRight, Check, Image, Images, Music, Share2, Play, User, UserRound, Camera, Lock, Instagram, Cloud, AtSign`. Map to `lucide-react-native` in-app.
- **`MusicPromo-Banner.png`** — default hero banner (not included; referenced as the default). Add from your asset catalog.
- All other imagery is `StripeFill` placeholder — replace with real pickers.

## Files
- **`MusicPromo Onboarding.html`** — entry point; mounts the wizard inside the iOS frame and loads the scripts below.
- **`onboarding-app.jsx`** — `Onboarding` shell: header, progress, footer CTA, permission alert, finish overlay, persistence, Tweaks. Step registry `STEPS` lives here.
- **`onboarding-steps.jsx`** — the 6 step bodies (`StepValue, StepFlow, StepPermPhotos, StepPermAudio, StepProfile, StepReady`) + `StepHead`, `Field`, `PermTile`, `HelperNote`.
- **`share-card.jsx`** — `ShareCardPreview` + `StripeFill`, `Avatar`, `SocialRow`.
- **`icon.jsx`** — Lucide wrapper. **`tweaks-panel.jsx`** — review-only tweak controls (do not ship). **`colors_and_type.css`** — token + type definitions. **`fonts/Inter.ttf`**.

### Suggested mapping to the real codebase
- Step bodies → screens under `src/components/onboarding/` using the existing wizard chrome / story-slide / permission-primer primitives.
- `ShareCardPreview` → the real `src/components/ShareCardPreview.tsx` (do not fork; pass `previewScale={0.55}`, `emptyPromos`).
- Profile hero/avatar overlap → reuse the **Profile tab** hero banner + avatar component so onboarding and the live profile stay visually identical.
