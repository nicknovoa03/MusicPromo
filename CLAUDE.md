# MusicPromo — Claude Code Context

## Project

React Native / Expo app (iOS + Android). No web target. Stack: Expo, Clerk, Convex, PostHog, FFmpeg-kit.

Full product design requirements: `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`
Full agent design requirements: `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md`

## Brand Fonts

**Primary typeface:** Inter  
**Font file:** `assets/fonts/Inter.ttf` (variable font — covers all weights 100–900)  
**Web import:** `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`  
**CSS font stack:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`  
**Mobile:** SF Pro (iOS system default) with Inter as cross-platform fallback via `expo-font`

Type scale (from PRD §9):
- H1: 28pt / bold (700)
- H2: 22pt / semibold (600)
- Body: 16pt / regular (400)
- Caption: 13pt / regular (400)
- Button: 17pt / semibold (600)

All wireframes, mockups, and web-rendered previews must load Inter via the font file or Google Fonts URL above.

## Design System

- **Theme:** Adaptive light/dark. Light for browse (Home, Picker), dark for edit/export/share.
- **Accent colors:** High-contrast neutral. Primary action = black fill / white icon. Instagram gradient = `#F58529 → #DD2A7B → #8134AF`.
- **Reference app:** Meta's Edits app (see `docs/design-inspiration/` for screenshots).
- **Radius:** sm=6, md=12, lg=20
- **Spacing:** xs=4, sm=8, md=16, lg=24, xl=32, xxl=48

## Current Phase

**App Store v1 (iOS, Music Promo only)** — `EXPO_PUBLIC_LAUNCH_SCOPE=music-promo-only` (default). SPK and Show Flyer routes stay in repo but are hidden; set `EXPO_PUBLIC_LAUNCH_SCOPE=full` to re-enable. Production EAS submit is iOS-only.

Deferred until post-v1: Phase 8 Song Press Kit (`docs/requirements/SONG_PRESS_KIT_REQUIREMENTS.md`), Show Flyer (`docs/requirements/SHOW_FLYER_REQUIREMENTS.md`).
