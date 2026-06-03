# App Store v1 — Launch Scope (Music Promo Only)

MusicPromo v1 ships as **Music Promo video only on iOS**. Song Press Kit (SPK) and Show Flyer remain in the codebase but are **hidden at runtime** until a later release.

Implementation: `src/lib/launchScope.ts`  
EAS env: `EXPO_PUBLIC_LAUNCH_SCOPE` in `eas.json`

---

## What users see in v1

| Surface | `music-promo-only` (default) | `full` |
|--------|------------------------------|--------|
| **Create tab** | Photo + audio picker directly | Project type picker (3 cards) |
| **Home FAB** | `/create/picker` | `/create/type-picker` |
| **Home project grid** | Video promos only (`type` unset, `video`, or legacy rows) | All types including SPK / flyer drafts |
| **SPK / Flyer URLs** | Redirect to Create tab | Normal flows |

---

## What stays in the repo (not deleted)

- Routes: `app/create/spk/*`, `app/create/flyer/*`
- Components: `src/components/spk/*`, `src/components/flyer/*`
- Convex schema fields for `type: "spk" | "flyer"` and related metadata

Drafts created before v1 still exist in Convex / local storage; they are **filtered off Home** while launch scope is `music-promo-only`. They reappear when scope is `full`.

---

## Environment variable

| Value | Behavior |
|-------|----------|
| *(unset)* or `music-promo-only` | v1 App Store behavior (default in code) |
| `full` or `all` | All project types visible |

Set at **build time** via EAS profile `env` or local `.env` for dev. Changing it requires a **new native build** (not just restarting Metro).

Current `eas.json`:

- **preview** — `EXPO_PUBLIC_LAUNCH_SCOPE=music-promo-only`
- **production** — `EXPO_PUBLIC_LAUNCH_SCOPE=music-promo-only`
- **development** — unset (still defaults to `music-promo-only` in code)

---

## Builds and submit

```bash
# Internal QA on device (install link from EAS)
npx eas build -p ios --profile preview

# App Store / TestFlight binary
npx eas build -p ios --profile production

# Submit to App Store Connect (iOS only in eas.json)
npx eas submit -p ios --profile production
```

v1 submit profile is **iOS only** (`eas.json` → `submit.production.ios`). Android can be added later without changing launch-scope code.

---

## Verify the correct build is installed

Open **Create**:

- **v1 build** — goes straight to photo + audio selection (no “New Project” type picker).
- **Old build** — shows three cards: Music Promo, Song Press Kit, Event Flyer.

If you see three cards, install a newer IPA from EAS; OTA cannot enable launch scope on an older binary that never included this code.

---

## Re-enable SPK / Show Flyer (v1.1+)

1. Set `EXPO_PUBLIC_LAUNCH_SCOPE=full` on the EAS profile (or remove the var and change the default in `launchScope.ts` to `full`).
2. Run a new `eas build` and ship.

No need to restore deleted files unless you intentionally removed them in a cleanup PR.

---

## Code map

| File | Role |
|------|------|
| `src/lib/launchScope.ts` | Scope resolution and project filtering helpers |
| `src/components/LaunchScopeRedirect.tsx` | Blocks SPK / flyer stacks when scope is limited |
| `app/(tabs)/create.tsx` | Picker vs type picker on Create tab |
| `app/(tabs)/index.tsx` | FAB route, home list filter, resume guards |
| `app/create/type-picker.tsx` | Filters visible cards when scope is limited |
| `app/create/spk/_layout.tsx`, `app/create/flyer/_layout.tsx` | Mount redirect guard |

---

## Why gate instead of delete?

- Faster v1 submit: one small flag, no large risky delete before review.
- v1.1 turns features back on with env + rebuild, not a rewrite.
- SPK / flyer can stay developed on branches with `EXPO_PUBLIC_LAUNCH_SCOPE=full` locally.

Remove SPK/flyer from the repo only if they are parked long-term; do that **after** v1 is live, on a dedicated cleanup branch.

---

## Related docs

- [iOS EAS + TestFlight Checklist](./testflight-checklist.md)
- Song Press Kit requirements: `docs/requirements/SONG_PRESS_KIT_REQUIREMENTS.md`
- Show Flyer requirements: `docs/requirements/SHOW_FLYER_REQUIREMENTS.md`
