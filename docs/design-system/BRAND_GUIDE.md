# MusicPromo — Brand Guide

Doc owner: Nick  
Last updated: 2026-06-03

---

## 1. One-liner

MusicPromo helps indie artists turn **a photo + an audio clip** into a **short promo video** for social — fast, without a timeline editor.

---

## 2. Brand adjectives

| Adjective | Means in UI |
|-----------|-------------|
| **Clean** | Few controls per screen; no dashboard clutter |
| **Modern** | Neutral high-contrast, not skeuomorphic |
| **Creative** | Feels at home for musicians and visual artists |
| **Easy** | Obvious next step; short paths |
| **Professional** | Credible enough for venues/promoters (profile card) |

---

## 3. Voice & tone

- **Direct** — “Pick audio, then a photo,” not “Initialize your media pipeline.”
- **Encouraging, not hype** — “You’re set,” not “You’re crushing it!!!”
- **Creator-first** — releases, promos, shows; not “content” or “users.”
- **Short** — headlines do the work; body copy is one or two lines max on onboarding.

**Avoid:** startup jargon, guilt trips, fake urgency, emoji in product UI (marketing OK).

---

## 4. Logo & icon

| Asset | Path | Usage |
|-------|------|--------|
| App icon | `assets/branding/MusicPromo-App-Icon.png` | iOS/Android only |
| Logo mark | `assets/branding/MusicPromo-Logo.png` | Watermark, in-app mark |
| Default banner | `assets/branding/MusicPromo-Banner.png` | Profile hero fallback |
| Default avatar | `assets/defaults/MusicPromo-DefaultAvatar.jpg` | Empty avatar state |

**Do:** plenty of clear space; on dark or light backgrounds use existing token pairs.  
**Don’t:** stretch, recolor the logo arbitrarily, or place on busy photo without scrim.

---

## 5. Reference products

| App | What to borrow |
|-----|----------------|
| **Meta Edits** | Create flow, picker density, export/share (primary) — `docs/design-inspiration/` |
| **Apple contact / profile cards** | Hero + overlapping avatar (Profile, onboarding profile step) |
| **Spotify (legacy profile)** | Secondary only for link rows / artist identity |

Drop screenshots into `docs/design-inspiration/<topic>/` with a one-line note.

---

## 6. Photography & illustration

- **In-app:** user’s own artwork, photos, and promos — never stock “office” imagery in product chrome.
- **Onboarding / primers:** simple illustrations or abstract device mocks; optional artist-adjacent texture (vinyl, waveform) — not clip-art people.
- **Profile:** user-controlled banner and avatar; brand default banner is neutral until they customize.

---

## 7. Color personality

- **Primary UI:** black & white high-contrast neutrals (see `DESIGN_SYSTEM.md`).
- **Instagram gradient** (`#F58529 → #DD2A7B → #8134AF`): **Share to Instagram** and similar social actions only — not general CTAs.
- **No** purple SaaS gradients, glassmorphism overload, or neon accent soup.

---

## 8. Light-first strategy (v1 design)

New design work (**onboarding**, sign-in refresh, browse polish) is **light mode only** until the light catalog is complete in docs and code.

Existing **dark** editor / export / share screens stay as-is in the app; dark theme tokens remain in code for those surfaces. A full dark component catalog is Phase 2 of this guide.

---

## 9. Do / don’t

| Do | Don’t |
|----|--------|
| One primary CTA per screen | Competing filled buttons |
| Permission primers before OS dialogs | Surprise system sheets mid-tap |
| Skeleton grids on Home | Full-screen spinners on browse |
| Scale-down press (0.97) on CTAs | Opacity-only “dead” buttons |
| Inter / SF Pro type scale | Random font sizes |
| Show real share-card preview in onboarding | Generic placeholder avatars in marketing of the feature |

---

## 10. Related docs

- [BRAND_GUIDE_WORKFLOW.md](./BRAND_GUIDE_WORKFLOW.md) — how to create a brand guide (intake + prompts)
- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) — tokens & layout
- [COMPONENTS.md](./COMPONENTS.md) — UI building blocks
- [CLAUDE_DESIGN_HANDOFF.md](./CLAUDE_DESIGN_HANDOFF.md) — wireframes → code
- [ONBOARDING_REQUIREMENTS.md](../requirements/ONBOARDING_REQUIREMENTS.md)
