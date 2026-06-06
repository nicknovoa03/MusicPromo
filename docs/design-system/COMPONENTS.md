# MusicPromo — Component Catalog

Doc-first catalog. **Status:** `shipped` | `planned` | `deprecated`

Code paths are relative to repo root. Add a row when you ship a reusable pattern.

---

## Shells & navigation

| Component | Status | Light / dark | Code | Notes |
|-----------|--------|--------------|------|-------|
| Tab bar | shipped | Adaptive | `app/(tabs)/_layout.tsx` | Home, Create, Profile |
| Sign-in screen | shipped | Light | `app/(auth)/sign-in.tsx` | Apple, Google, Guest |
| Wizard shell | shipped (primitive) | **Light** | `src/components/onboarding/OnboardingWizardChrome.tsx` | Progress bar + step counter + Skip |
| Permission primer shell | shipped (primitive) | **Light** | `src/components/onboarding/PermissionPrimerScreen.tsx` | Shared by `perm-photos`, `perm-audio`, `perm-save` |
| Story slide shell | shipped (primitive) | **Light** | `src/components/onboarding/OnboardingStorySlide.tsx` | Intro + finish slides |
| Onboarding CTAs | shipped (primitive) | **Light** | `OnboardingPrimaryButton`, `OnboardingSecondaryButton` | Scale press |

---

## Buttons & actions

| Component | Status | Light / dark | Code | States |
|-----------|--------|--------------|------|--------|
| Primary CTA | shipped | Both | Various | Default, pressed (0.97), disabled + spinner |
| Secondary text button | shipped | Both | e.g. Skip, Cancel | Pressed |
| FAB (+) | shipped | Light browse | `app/(tabs)/index.tsx` | Black square, white icon |
| Skip pill | shipped | Light | `app/onboarding.tsx` | Outlined capsule |
| Instagram gradient share | shipped | Dark share | `app/create/share.tsx` | Social only |

**Press feedback:** `src/lib/pressFeedback.ts`

---

## Inputs & forms

| Component | Status | Light / dark | Code | Notes |
|-----------|--------|--------------|------|-------|
| Text field (profile) | shipped | Light sheet | `app/(tabs)/profile.tsx` | Name, bio |
| Artist name field | planned | **Light** | Onboarding profile step | Required |
| Bio optional field | planned | **Light** | Onboarding | 280 chars |
| Avatar picker ring | shipped | Both | Profile + planned onboarding | Library picker |
| Hero banner picker | shipped | Both | Profile + planned onboarding | Tap banner area |

---

## Cards & lists

| Component | Status | Light / dark | Code | Notes |
|-----------|--------|--------------|------|-------|
| Project card | shipped | Light | `app/(tabs)/index.tsx` | Thumb + title + date |
| Project thumbnail | shipped | Light | `src/components/ProjectThumbnail.tsx` | Template stage preview |
| Project grid skeleton | shipped | Light | `src/components/ProjectGridSkeleton.tsx` | 2-column shimmer |
| Media picker card | shipped | Light | `app/create/picker.tsx` | Audio + photo stacks |
| Share card preview | shipped | Dark card | `src/components/ShareCardPreview.tsx` | Profile export + onboarding mini preview |
| Empty state (Home) | shipped | Light | `app/(tabs)/index.tsx` | Icon + title + subtitle |

---

## Create / editor (dark — existing)

| Component | Status | Code |
|-----------|--------|------|
| Template stages (whole / cd / vinyl) | shipped | `src/components/create/*TemplateStage.tsx` |
| Template customize modal | shipped | `src/components/create/TemplateCustomizeModal.tsx` |
| Audio trimmer | shipped | `src/components/create/AudioTrimmer.tsx` |
| Template switcher | shipped | `src/components/create/TemplateSwitcher.tsx` |
| Aspect ratio toggle | shipped | `src/components/create/AspectRatioToggle.tsx` |
| Beta watermark | shipped | `src/components/create/BetaWatermark.tsx` |

*Dark create components: expand in this catalog in Phase 2.*

---

## Feedback & loading

| Component | Status | Code |
|-----------|--------|------|
| Shimmer block | shipped | `src/components/Shimmer.tsx` |
| Launch scope redirect | shipped | `src/components/LaunchScopeRedirect.tsx` |
| App loading gate | shipped | `src/components/AppLoadingGate.tsx` |

---

## Onboarding-specific (planned)

Build as shared components when implementing designs:

| Component | Reuse |
|-----------|-------|
| `OnboardingWizardChrome` | Header + progress bar + footer dots |
| `OnboardingStorySlide` | Illustration + eyebrow + title + body |
| `PermissionPrimerScreen` | Illustration + title + body + Continue / Not now |
| `OnboardingProfileStep` | Hero + avatar + fields + share-card preview |
| `ShareCardPreviewMini` | Extract from Profile `ViewShot` layout |

---

## Component anatomy — primary button (light)

```
┌─────────────────────────────────────┐
│           Continue                  │  height 56, typography.button
└─────────────────────────────────────┘
  fill: accent.primary (#FFF)
  label: accent.onPrimary (#000)
  radius: radius.md (12)
  pressed: scale 0.97
```

Document other anatomies in this file when you add components (ASCII or short spec).

---

## Adding a new component

1. Add row to this table with `planned` → `shipped`.  
2. Add tokens only if truly new (prefer existing).  
3. Implement in `src/components/` (or feature folder).  
4. Link code path in the table.

---

## Related

- [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)
- [ONBOARDING_REQUIREMENTS.md](../requirements/ONBOARDING_REQUIREMENTS.md)
