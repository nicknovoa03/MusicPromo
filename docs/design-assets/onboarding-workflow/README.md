# Onboarding — Implementation notes

Specs and design system drive implementation directly in React Native — no separate design tool required.

## Requirements

- [ONBOARDING_REQUIREMENTS.md](../../requirements/ONBOARDING_REQUIREMENTS.md)
- [ONBOARDING_RECOMMENDATIONS.md](../../requirements/ONBOARDING_RECOMMENDATIONS.md)
- [DESIGN_SYSTEM.md](../../design-system/DESIGN_SYSTEM.md) — light theme
- [COMPONENTS.md](../../design-system/COMPONENTS.md) — shells to build

## 6 wizard steps

| # | Step ID | Type |
|---|---------|------|
| 1 | `value` | Story |
| 2 | `flow` | Story |
| 3 | `perm-photos` | Permission primer |
| 4 | `perm-audio` | Permission primer |
| 5 | `profile-setup` | Form — hero + avatar + name + optional bio + preview |
| 6 | `ready` | Story — Start Creating |

`perm-save` is **not** in onboarding (first export on Share screen only).

## Optional folder contents

Use this folder for notes or screenshots from device previews if helpful:

```
onboarding-workflow/
  README.md
  copy.md            ← final strings per step ID (source for onboardingCopy.ts)
  previews/          ← optional simulator screenshots
```

**Copy:** [`copy.md`](./copy.md) · **Code mirror:** `src/constants/onboardingCopy.ts`

## Inspiration

`docs/design-inspiration/onboarding/` — reference screenshots only.

## Code target

`app/onboarding/` — refactor per requirements §13.
