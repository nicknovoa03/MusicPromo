# MusicPromo — Design System

**Source of truth (code):** `src/constants/tokens.ts`  
**Source of truth (spec):** this file — update here first, then `tokens.ts`, then screens.

Last updated: 2026-06-03

---

## 1. Theme strategy

| Surface group | Theme | Screens |
|---------------|-------|---------|
| **Browse / auth / onboarding** | **Light** (design focus v1) | Sign-in, onboarding, Home, Create picker, Profile edit sheet |
| **Create / export** | Dark (existing) | Editor, rendering, share |

New components for **onboarding** and browse polish use **light tokens only** until the light catalog is complete in `COMPONENTS.md`.

---

## 2. Colors — light (primary catalog)

| Token | Hex / value | Use |
|-------|-------------|-----|
| `colors.light.background` | `#FFFFFF` | Screen background |
| `colors.light.surface` | `#F5F5F5` | Cards, chips, secondary panels |
| `colors.light.surfaceMuted` | `#EEEEEE` | Skeletons, shimmer base |
| `colors.light.text` | `#000000` | Primary text |
| `colors.light.textSecondary` | `#4A4A4A` | Subtitles, metadata |
| `colors.light.border` | `#D6D6D6` | Hairlines, outlines |

### Accents (both themes in code; use on light as noted)

| Token | Value | Use on light surfaces |
|-------|-------|------------------------|
| `colors.accent.fill` | `#111111` | Icon circles, strong fills |
| `colors.accent.onFill` | `#FFFFFF` | Icon on fill |
| `colors.accent.primary` | `#FFFFFF` | Primary button fill (inverted: white button, black label via `onPrimary`) |
| `colors.accent.onPrimary` | `#000000` | Primary button label |
| `colors.accent.fab` | `#000000` | Home FAB |
| `colors.accent.fabIcon` | `#FFFFFF` | FAB icon |

### Overlays & brand tints (onboarding decorative blobs)

| Token | Value |
|-------|-------|
| `colors.overlay.light` | `rgba(255,255,255,0.82)` |
| `colors.overlay.lightStrong` | `rgba(255,255,255,0.92)` |
| `colors.brand.tintSoft` | `rgba(255,255,255,0.07)` |
| `colors.brand.tint` | `rgba(255,255,255,0.12)` |
| `colors.brand.tintStrong` | `rgba(255,255,255,0.18)` |

### Instagram gradient (restricted)

| Token | Stops |
|-------|-------|
| `colors.instagram` | `#F58529` → `#DD2A7B` → `#8134AF` |

Share / social CTAs only — see `BRAND_GUIDE.md`.

---

## 3. Colors — dark (existing; catalog deferred)

Documented for editor/export continuity. Full dark component catalog in `COMPONENTS.md` comes in Phase 2.

| Token | Hex |
|-------|-----|
| `colors.dark.background` | `#000000` |
| `colors.dark.surface` | `#111111` |
| `colors.dark.surfaceMuted` | `#1A1A1A` |
| `colors.dark.text` | `#FFFFFF` |
| `colors.dark.textSecondary` | `#B3B3B3` |
| `colors.dark.border` | `#2A2A2A` |

---

## 4. Typography

| Role | Token | Size | Weight | Example |
|------|-------|------|--------|---------|
| Screen title | `typography.h1` | 28 | 700 | Onboarding headline |
| Section title | `typography.h2` | 22 | 600 | Empty state title |
| Body | `typography.body` | 16 | 400 | Primer explanation |
| Caption | `typography.caption` | 13 | 400 | Step counter, dates |
| Button | `typography.button` | 17 | 600 | Continue, Start Creating |

**Fonts:** SF Pro (iOS system). Inter variable `assets/fonts/Inter.ttf` for cross-platform / web previews.

**Line height guidance:** body ~24pt; h1 ~36pt on multi-line onboarding titles.

---

## 5. Spacing

| Token | px | Typical use |
|-------|-----|-------------|
| `spacing.xs` | 4 | Tight gaps |
| `spacing.sm` | 8 | Dot gaps, inline padding |
| `spacing.md` | 16 | Card padding, screen gutters |
| `spacing.lg` | 24 | Section separation |
| `spacing.xl` | 32 | Footer padding |
| `spacing.xxl` | 48 | Large vertical rhythm |

**Screen horizontal padding:** `spacing.lg` (24) default; match Home and onboarding.

---

## 6. Radius

| Token | px | Use |
|-------|-----|-----|
| `radius.sm` | 6 | Skeleton lines, small chips |
| `radius.md` | 12 | Buttons, project cards |
| `radius.lg` | 20 | Large cards, modals |
| `radius.full` | 9999 | Pills, avatar, skip button |

Onboarding primary button height: **56pt**, `radius.md`.

---

## 7. Elevation & borders

- Prefer **hairline borders** (`colors.light.border`) over heavy shadows on light surfaces.
- Onboarding story cards may use soft shadow (see current `app/onboarding.tsx`) — don’t add new shadow styles without updating this section.
- FAB: solid fill, no gradient.

---

## 8. Motion & interaction

| Pattern | Spec | Code |
|---------|------|------|
| Primary press | `scale: 0.97` | `src/lib/pressFeedback.ts` |
| Subtle press | `scale: 0.98` | Header icon buttons |
| Transition duration | 150–300ms | Modals, collapsible panels |
| Page dots | Active pill widens to ~28pt | Onboarding footer |
| Progress bar | Thin bar under header, 0–100% with step index | Onboarding wizard (planned) |
| Loading | Skeleton shimmer, not center spinner | `Shimmer`, `ProjectGridSkeleton` |
| Reduce motion | Respect system setting | Future: gate shimmer |

---

## 9. Iconography

- **Library:** `@expo/vector-icons` Ionicons **outline** for browse; filled variants for selected tab states only.
- **Size:** 20–24 header actions; 28–34 feature icons in pickers.
- **Color:** `colors.light.text` or `textSecondary` on light; match parent button contrast.

---

## 10. Layout patterns (light)

| Pattern | Spec |
|---------|------|
| Wizard header | Step `caption` left, Skip pill right |
| Wizard footer | Dots centered, full-width primary CTA below |
| Profile hero | Wide banner 16:9-ish crop; avatar overlaps bottom edge (match Profile tab) |
| 2-column grid | Home projects; gap `spacing.sm` |
| Safe area | `SafeAreaView` top + bottom on full-screen flows |

---

## 11. Sync checklist

When you change this doc:

- [ ] Update `src/constants/tokens.ts` if values changed  
- [ ] Update affected screens / shared components  
- [ ] Add or update rows in `COMPONENTS.md`  

---

## 12. Related

- [BRAND_GUIDE.md](./BRAND_GUIDE.md)
- [COMPONENTS.md](./COMPONENTS.md)
- Legacy duplicate: PRD §9 in `PRODUCT_DESIGN_REQUIREMENTS.md` (prefer this file going forward)
