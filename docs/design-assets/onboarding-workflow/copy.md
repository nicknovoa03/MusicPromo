# Onboarding — Copy (v1)

Source for Claude Design and `src/constants/onboardingCopy.ts`. Light theme only. No SPK / Flyer mentions.

---

## Global chrome

| Element | Copy |
|---------|------|
| Loading gate | Preparing your workspace… |
| Skip (header) | Skip |
| Step counter format | `{current}/{total}` (total = 6) |

---

## Step 1 — `value` (story)

| Field | Copy |
|-------|------|
| Eyebrow | Fast start |
| Title | Turn a photo and a track into a promo in seconds |
| Body | Pick cover art, add audio, export a social-ready clip — no timeline editor. |
| Primary CTA | Next |

---

## Step 2 — `flow` (story)

| Field | Copy |
|-------|------|
| Eyebrow | Simple flow |
| Title | Pick, trim, export, share |
| Body | Four steps, under a minute. Built for releases, not editing courses. |
| Chips | Pick → Trim → Export → Share |
| Primary CTA | Next |

---

## Step 3 — `perm-photos` (permission primer)

| Field | Copy |
|-------|------|
| Title | Allow access to your photos |
| Body | MusicPromo needs your photo library for profile banner and cover art. We only access files you choose. |
| Bullet | You choose every file |
| Primary CTA | Continue |
| Secondary CTA | Not now |
| Already granted | You're all set |
| Denied inline | Photos access is off. Open Settings to allow access. |

---

## Step 4 — `perm-audio` (permission primer)

| Field | Copy |
|-------|------|
| Title | Access your audio files |
| Body | Choose MP3, WAV, or M4A from your device. You stay in control — we only use the file you select. |
| Bullet | You choose every file |
| Primary CTA | Continue |
| Secondary CTA | Not now |
| Already granted | You're all set |

*No iOS system dialog on this step — Continue marks the primer complete.*

---

## Step 5 — `profile-setup` (interactive)

| Field | Copy |
|-------|------|
| Title | Set up your artist profile |
| Subtitle | Used on your share card |
| Guest helper | Sign in later to sync your profile across devices. |
| Artist name label | Artist name |
| Artist name placeholder | Your artist name |
| Bio label | Bio (optional) |
| Bio placeholder | A short line about you or your music |
| Avatar tap hint | Add photo |
| Banner tap hint | Change banner |
| Preview section label | Preview |
| Empty promos on card | Your promos will show here |
| Primary CTA | Continue |
| Secondary CTA | Skip for now |
| Save error | Couldn't save your profile. Try again. |
| Permission denied (inline) | Photo access is off. Open Settings to add images. |

---

## Step 6 — `ready` (story / finish)

| Field | Copy |
|-------|------|
| Eyebrow | You're set |
| Title | You're set |
| Body | Your profile is ready. Create your first promo whenever you want. |
| Primary CTA | Start Creating |

---

## Fallback primer — `perm-save` (Share screen, not in wizard)

| Field | Copy |
|-------|------|
| Title | Save to your camera roll |
| Body | MusicPromo saves exported videos to your camera roll so you can share them. |
| Bullet | You control when exports are saved |
| Primary CTA | Continue |
| Secondary CTA | Not now |

*Aligns with `app.json` → `savePhotosPermission`.*

---

## Analytics labels (reference)

Events: `onboarding_profile_started`, `onboarding_profile_completed`, `onboarding_profile_skipped`, `permission_primer_viewed`, `permission_primer_continue`, `permission_primer_deferred`, `onboarding_completed`.
