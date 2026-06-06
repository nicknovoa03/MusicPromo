# Onboarding — Adopted Recommendations

Companion to [`ONBOARDING_REQUIREMENTS.md`](./ONBOARDING_REQUIREMENTS.md). Tracks product/UX decisions from the recommendations review (2026-06-03).

**Legend:** ✅ Adopted for v1 · ⏳ Adopted, phased · ❌ Deferred

---

## High impact — ✅ Adopted (v1)

| # | Recommendation | v1 behavior |
|---|----------------|-------------|
| **1** | Keep the path short | **`perm-save` is not in the onboarding wizard.** Show save-to-camera-roll primer on **first export** (Share screen) only. Onboarding primers: `perm-photos` + `perm-audio` only (plus intro + profile + finish). |
| **2** | Align system permission copy with primers | Primer copy must match `app.json` / Info.plist strings (`photosPermission`, `savePhotosPermission`). Design + eng review together before submit. |
| **3** | Finish → Create with intent | **Start Creating** → **Create tab** with picker in view (route to `/create` / embedded picker). Optional one-time hint on picker: “Add audio, then a photo.” |
| **4** | Guest-specific line on profile step | Subtitle or helper under profile title: *Sign in later to sync your profile across devices.* (guests only). |
| **5** | Resume where they left off | **Required:** persist `onboardingStep` locally; cold start resumes last incomplete step (not restart from slide 1). |

---

## Polish — ✅ Adopted (v1 unless noted)

| # | Recommendation | v1 behavior |
|---|----------------|-------------|
| **6** | Progress that feels finite | Step counter **plus** thin top progress bar across full wizard (in addition to footer dots on story steps). |
| **7** | Pre-fill wins | Profile step mounts with Clerk name/avatar in fields **and** share-card preview immediately (before user edits). |
| **8** | Denied-permission designs | ✅ Adopted — **⏳ design pass after main onboarding visuals are approved** (second-round frames for denied / Open Settings per primer). |
| **10** | Sign-in visual continuity | Onboarding uses same light theme, type scale, and header rhythm as sign-in (Inter/SF, spacing tokens from `src/constants/tokens.ts`). |

**Not adopted from polish list:** #9 (haptics on primers) — optional nice-to-have; add in implementation if trivial.

---

## Deferred — ❌ Not v1 onboarding

| Item | Decision | Notes |
|------|----------|-------|
| Push notification primer in onboarding | ❌ Defer | Best moment: **after first successful export** (Profile or post-share), not first launch. |
| Interactive “sample promo” on finish | ❌ Defer | Strong v1.1 idea; needs assets and playback scope. |
| Multiple social links in onboarding | ❌ Defer | Profile tab link manager stays the place for full link setup. |
| In-app re-onboarding tooltips | ❌ Defer | Use `CURRENT_ONBOARDING_VERSION` bump when slide content changes. |
| Hero banner on profile step | ✅ In v1 | **Hero + avatar** on profile-setup step (Profile-style layout). Optional to change; default `MusicPromo-Banner.png` until user picks. |

### Bio on profile step — ✅ Optional in v1

| Question | Decision |
|----------|----------|
| Include bio in onboarding? | **Yes, optional** — not required to continue. |

**Rationale:** Bio helps the share card feel real for artists who want it, but forcing it adds friction. Most users should pass through with name + avatar only.

**Design spec:**

- Single **“Bio (optional)”** field below artist name — collapsed by default **or** always visible with 280 char limit (pick one in mocks; collapsed preferred for speed).
- Primary **Continue** enabled with name only; bio empty is fine.
- Live share-card preview shows bio when non-empty.
- Do **not** add link rows in onboarding v1.
- **Hero banner** is on the same step as avatar (tap to change); not required to continue.

---

## QA checklist (from recommendations)

- [ ] Clean install: all permissions denied → still complete onboarding and reach Create (fallback primers work).
- [ ] Clean install: all granted → no redundant system sheets on avatar tap.
- [ ] Guest path: local profile persists; guest copy visible.
- [ ] Apple sign-in path: Clerk pre-fill on profile step.
- [ ] Kill app mid-wizard → resume correct step.
- [ ] Skip entire onboarding → can still create promo; primers appear at first need.

---

## References

- Main handoff: [`ONBOARDING_REQUIREMENTS.md`](./ONBOARDING_REQUIREMENTS.md)
- Sign-in surface: `app/(auth)/sign-in.tsx`
- Permission strings: `app.json` → `expo-image-picker`, `expo-media-library` plugins
