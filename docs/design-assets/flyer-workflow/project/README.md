# MusicPromo Design System

A reference design system for **MusicPromo** — a free iOS app that lets DJs and independent artists generate branded promo videos and **EPK (Electronic Press Kit) carousels** in seconds. No design skills required, no editor to fight with.

This system was reverse-engineered from the production codebase (React Native + Expo). It exists so an agent (or designer) can hand-author new screens, marketing assets, and decks that look and feel like the real product.

---

## Product context

**App name:** MusicPromo
**Platform:** iOS only (mobile portrait)
**Stack:** React Native + Expo (file-based routing under `app/`), Convex backend, Clerk auth, PostHog analytics, Ionicons icon set.
**Audience:** Independent musicians, DJs, producers. People who'd rather be making music than fighting Figma.

### The four tabs
1. **Home** — grid of past projects (long-press → multi-select; ⋯ → duplicate/delete)
2. **Search** — public artist discovery *(not yet in the codebase we were given)*
3. **Create** — the **+** entry point that opens the type picker
4. **Profile** — artist settings, social links, bio, shareable artist card

### The two creation flows

| Flow | Output | Steps |
|---|---|---|
| **Music Promo** | Vertical 9:16 video clip (photo + audio loop) | Type picker → media picker → editor → render → share |
| **EPK Carousel** *(Phase 8 — new)* | Four 1:1 Instagram-ready slides | Type picker → details → vision → preview/export |

The MusicPromo path was already shipped. Phase 8 inserts a **type picker** in front of the existing flow, then branches into a new 3-step EPK flow. We are designing **only the new screens** in this project. The Music Promo path is untouched.

---

## Sources used

- **Codebase** (local mount, read-only) — `app/` (Expo Router screens):
  - `app/(tabs)/index.tsx`, `(tabs)/profile.tsx`, `(tabs)/create.tsx`, `(tabs)/_layout.tsx`
  - `app/create/type-picker.tsx`, `picker.tsx`, `editor.tsx`, `rendering.tsx`, `share.tsx`
  - `app/create/epk/details.tsx`, `vision.tsx`, `preview.tsx`, `_layout.tsx`
  - `app/onboarding.tsx`, `app/(auth)/sign-in.tsx`

> **Note for the reader:** only the `app/` route folder was mounted. The token file (`constants/tokens.ts`), `assets/branding/`, `components/`, `components/epk/`, and Convex schema were referenced by the routes but not directly readable. The colors, spacing, and typography values in `colors_and_type.css` were inferred from how they are *used* in the code — they are accurate to the call sites but not lifted from the source of truth. **If you have direct access to `constants/tokens.ts`, please attach it so we can true-up the tokens.**

- **No Figma file** was provided. No marketing site, no decks.
- **No brand logos** were directly accessible (referenced as `assets/branding/MusicPromo-Logo.png` but the folder wasn't mounted). A neutral wordmark placeholder lives in `assets/` — swap it in when the real logo is attached.

---

## Index

| File | What's in it |
|---|---|
| `README.md` | This file — product overview, content + visual foundations, iconography |
| `SKILL.md` | Agent skill manifest. Cross-compatible with Claude Code Agent Skills. |
| `colors_and_type.css` | All CSS variables: tokens + semantic styles (h1, body, label, etc.) |
| `assets/` | Logos, icons, placeholder imagery. **Currently a placeholder wordmark — needs the real logo.** |
| `fonts/` | Web font files. Currently uses Inter as a stand-in for iOS system font. |
| `preview/` | Small HTML cards that populate the Design System tab |
| `ui_kits/mobile-app/` | iOS app UI kit — interactive recreation of the screens that already exist |
| `wireframes/` | **The main deliverable** — Phase 8 EPK Carousel low-fi wireframes + flow diagram |

---

## Content fundamentals

The voice is **calm, encouraging, and operational** — the app is a tool, not a personality. It speaks to a working artist who already knows what they want; it just gets out of the way.

### Voice principles
- **You-language**, never "we" or "I". (`"You can change this later."`, not `"We'll save this for you."`)
- **Imperative for actions**, declarative for status. (`"Pick audio"`, `"4 slides saved to your Camera Roll."`)
- **No fluff, no marketing-speak.** Avoid: "amazing", "powerful", "seamlessly", "elevate", "craft".
- **Short.** A title is 2–6 words. A body line is one short sentence.
- **No emoji.** Anywhere. Iconography is Ionicons.
- **No exclamation points** except in genuine success states (`"Exported!"`).
- **One specific number when it helps.** (`"4 slides saved"`, `"280 characters left"`).
- **Acknowledge constraints honestly.** (`"Sign in to link an existing Music Promo."`)

### Casing rules
| Surface | Casing | Example |
|---|---|---|
| Screen titles | Sentence case | `New Project`, `Vision`, `Preview` |
| Buttons / CTAs | Sentence case | `Pick a photo`, `Next`, `Export Carousel` |
| Section labels | **ALL CAPS, letter-spaced** | `TRACK DETAILS`, `VISION` |
| Tab labels | Sentence case | `Home`, `Create`, `Profile` |
| Errors / alerts | Sentence case, period-terminated | `"Could not open photo library. Please try again."` |
| Placeholders | Conversational fragments | `"What's the story behind this track?"`, `"e.g. Midnight Drive"` |

### Examples lifted from the code

| Surface | Copy |
|---|---|
| Type picker title | `New Project` / `What are you making?` |
| Type picker cards | `Music Promo — Turn a photo + audio clip into a short promo video` / `EPK Carousel — Generate a 4-slide Instagram carousel for a track` |
| Empty home state | `Create your first promo` / `Tap + to get started` |
| Vision placeholder | `What's the story behind this track?` |
| Profile nudge | `Add a bio and social links to complete your EPK` |
| Export success | `Exported!` / `4 slides saved to your Camera Roll. Open Instagram and create a carousel post.` |
| Delete confirmation | `Delete project? — If you choose to delete, you'll lose this project.` |
| Onboarding eyebrow | `Fast Start`, `Simple Flow`, `Your Artist Card`, `You Are Set` |
| Onboarding title | `Turn one photo and one track into a promo in seconds` |

### Tone of error states
Honest, never blaming. Always actionable.
- ✅ `"Could not load that image. Please try another one."`
- ✅ `"Session isn't ready yet. Please wait a moment and try again."`
- ❌ `"Oops! Something went wrong 😅"`

---

## Visual foundations

### Theme model
Two themes coexist:
- **App chrome theme** — adapts to iOS light/dark via `useColorScheme()`. Light is bright neutral; dark is near-black. Used for Home, Create wizard, Profile, settings, modals.
- **Editorial theme (EPK + onboarding)** — **always dark**, regardless of system setting. This is the export artifact theme: black background, white type, generous negative space. The EPK preview screen even pins its container to pure `#000` so the slides bleed into the chrome. Onboarding also lives in dark by default.

The two themes share the same token names — they only swap palettes.

### Color
- **Background:** soft neutral white in light, near-black (`#0E1014` range) in dark
- **Surface:** one step elevated from background; cards, sheets, inputs
- **Surface muted:** two steps elevated; thumbnails, illustration backgrounds
- **Border:** hairline (`StyleSheet.hairlineWidth`, ≈ 0.33px on @3x). Borders carry layout — they're not decorative.
- **Accent primary:** a single saturated indigo-blue used for the primary CTA. Restraint is the rule — only one accent button per screen.
- **Destructive:** a single warm red (`#C62828`), used only on Delete.
- See `colors_and_type.css` for actual hex values.

Color usage is **disciplined**. There are no gradients, no rainbow chips, no left-border accent cards. Hierarchy comes from **typography weight + neutral surface stack**, not from hue.

### Typography
- **Body / UI:** iOS system font stack (`-apple-system, "SF Pro Text"`). On web we substitute **Inter** — flag this substitution.
- **No display serif, no script font.** The app never decorates.
- The EPK slides break the rule once: the **track title on slide 2** is set in a tall, condensed display sans (we use Inter Tight / Anton as a web stand-in). This is the only place display type appears.
- **Section labels are uppercase, letter-spaced ~2px, 11–13px, weight 600–700.**

### Spacing
Token scale: `xs 4 / sm 8 / md 16 / lg 24 / xl 32` (px). All horizontal screen padding is `spacing.lg` (24). All vertical rhythm is multiples of 8.

### Layout
- **Sticky top header** (back chevron / title / step counter) — always 44pt tall.
- **Sticky bottom CTA** in wizards, with `paddingBottom: insets.bottom + spacing.sm`. The button is full-width, `radius.md`.
- **One primary action per screen.** Secondary actions live in the header (text-only).
- **No bottom sheets for primary CTAs.** Sheets are reserved for picker modals (link existing project, project actions).

### Cards & elevation
- **Radius:** `sm 8 / md 12 / lg 20 / full 999`. Cards typically use `md` or `lg`. Pill buttons and avatars use `full`.
- **No drop shadows.** Elevation is conveyed by **surface color stepping** (`background → surface → surfaceMuted`) and **hairline borders**. This is intentionally flat, more iOS Settings than Material.
- Card pattern: `backgroundColor: surface`, `borderRadius: radius.md`, optional `borderWidth: StyleSheet.hairlineWidth`.

### Borders & dividers
Always hairline. Always border color from the token, never custom. Dashed borders are reserved for the **empty media-picker frame** — the only place a dashed border appears.

### Press states
- **Opacity 0.8** + **scale 0.985** (very subtle). Defined once as a `pressed` style and reused.
- Avatars/FAB push to **0.85** opacity; no scale.
- Long-press → multi-select with `Haptics.selectionAsync()` on iOS.

### Animation
- **Stack transitions:** iOS default left/right slide for normal pushes. The EPK Preview screen uses `animation: "fade"` because it's the export artifact reveal.
- **Modals:** `animationType="slide"` with `presentationStyle="pageSheet"` (native iOS sheet) for the project picker; `animationType="fade"` for action menus.
- **Bespoke pan:** the profile-settings drawer slides horizontally with `Easing.out(Easing.cubic)` at 280ms and dismisses at 230ms.
- **No bounce, no spring overshoot.** Everything is `cubic`/`linear`. Confident, never playful.

### Transparency, blur, overlays
- **Overlays:** `rgba(0,0,0,0.3)` to `rgba(0,0,0,0.56)` for image overlays (cover slide darkening, photo-change chip).
- **No iOS blur (`BlurView`) is used anywhere.** Cards are solid surfaces.
- Stronger overlay variant (`overlay.lightStrong` / `rgba(14,16,20,0.78)`) is used only for the **⋯ menu disc on top of a thumbnail**.

### Imagery
- User-supplied photos dominate. The app rarely ships its own imagery.
- When a placeholder is needed, it's the **Ionicons line icon** on a `surface` background.
- **No stock photography. No illustrations. No 3D.**
- The EPK Cover slide darkens user photos with a `rgba(0,0,0,0.3-0.5)` overlay so type stays readable; no other artistic filter is applied.

### Iconography → see ICONOGRAPHY section below.

---

## Iconography

**Single source: [Ionicons](https://ionic.io/ionicons)** (`@expo/vector-icons/Ionicons`).

- Always the **outline** variant (`*-outline` suffix). Solid variants are used only inside the iOS native context menu and the bulk-delete CTA (`trash-outline` is still outline; truly-filled icons are rare).
- Stroke weight is fixed by the icon family — do not mix with Lucide, Heroicons, or hand-rolled SVG.
- Default sizes: **14** (inline label), **16** (button), **18–22** (header chevron, action icons), **34–48** (empty states).
- Always paired with `color={token}` — never a hard-coded hex.

For this design system's web mocks we substitute **Lucide** (the closest stroke-style match) via CDN, since Ionicons is not delivered as a webfont. **Flag this substitution** — when shipping to production, use the real Ionicons.

### Glyph inventory used in the codebase
home, add, add-circle-outline, person-outline, image-outline, musical-note(-outline), film-outline, film.stack, layers-outline, sparkles-outline, musical-notes-outline, person-circle-outline, rocket-outline, link-outline, checkmark-circle, checkmark, close, close-outline, ellipse-outline, ellipsis-horizontal, chevron-back, chevron-forward, arrow-forward, camera-outline, share-outline, trash-outline, copy-outline, checkbox-outline, flash.

### Other icon usage rules
- **No emoji.** The codebase never renders one.
- **No unicode glyphs as icons** — except curly quotes (`" "`) in the EPK Vision slide, which are typographic, not iconographic.
- **Avatar fallback:** `MusicPromo-DefaultAvatar.jpg` (a neutral grey portrait silhouette). When no avatar exists, this image renders, not an icon.
- **Logo:** wordmark referenced as `assets/branding/MusicPromo-Logo.png`. Used as a watermark on rendered videos. **Not directly accessible — placeholder in `assets/`.**

---

## A note on what's missing

- **Real `constants/tokens.ts`** — palette inferred from usage. Replace `colors_and_type.css` hex values when the file is attached.
- **Real logo + brand mark** — currently a wordmark placeholder.
- **Default avatar JPG** — placeholder grey silhouette.
- **EPK slide components** (`components/epk/Epk{Cover,TrackDetails,Vision,Bio}Slide.tsx`) — not mounted. Visual structure reverse-engineered from the spec + the parent `preview.tsx`.
- **Font files** — Inter substituted for iOS system. Display headline uses Anton (Google Fonts) as a stand-in.

**Please attach the real `constants/tokens.ts`, the EPK slide components, the `assets/branding/` folder, and the `components/ProjectThumbnail.tsx` file** so the system can be trued-up.
