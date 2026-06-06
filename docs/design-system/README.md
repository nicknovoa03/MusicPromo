# MusicPromo Design System

**Your standardized UI template + brand guide.** Build screens in React Native using these docs and `src/constants/tokens.ts`.

## Start here

| Building… | Read |
|-----------|------|
| Any new screen | [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) + [COMPONENTS.md](./COMPONENTS.md) |
| Copy / tone / logo | [BRAND_GUIDE.md](./BRAND_GUIDE.md) |
| A specific feature | `docs/requirements/<FEATURE>_REQUIREMENTS.md` |

## Workflow (doc + code)

1. **Check** `COMPONENTS.md` — reuse before inventing.
2. **Style** with `colors`, `typography`, `spacing`, `radius` from `@/constants/tokens`.
3. **Interact** with `pressScaleStyle` from `@/lib/pressFeedback` on primary taps.
4. **New token?** Update `DESIGN_SYSTEM.md` first, then `tokens.ts`.
5. **New reusable UI?** Add a row to `COMPONENTS.md` when shipped.

If doc and code disagree: **update the doc or fix the code** — don’t leave them drifting.

## Per-screen checklist

- [ ] Light browse surfaces use `colors.light.*` (see theme table in `DESIGN_SYSTEM.md`)
- [ ] Type uses `typography.h1` / `h2` / `body` / `caption` / `button` — no one-off font sizes
- [ ] Horizontal padding `spacing.lg` unless spec says otherwise
- [ ] Primary CTA: height ~56, `radius.md`, scale press on press
- [ ] Loading: skeleton/shimmer on lists — not full-screen spinner on content areas
- [ ] Voice matches `BRAND_GUIDE.md` (direct, creator-first, short)

## Files

| Doc | Purpose |
|-----|---------|
| [BRAND_GUIDE.md](./BRAND_GUIDE.md) | Voice, logo, photography, do/don’t |
| [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) | Colors, type, space, motion, light-first rules |
| [COMPONENTS.md](./COMPONENTS.md) | Component catalog + code paths |

## Feature design handoffs

| Feature | Requirements | Design assets |
|---------|--------------|---------------|
| Onboarding | [ONBOARDING_REQUIREMENTS.md](../requirements/ONBOARDING_REQUIREMENTS.md) | [onboarding-workflow/](../design-assets/onboarding-workflow/) |
| Product (full) | [PRODUCT_DESIGN_REQUIREMENTS.md](../requirements/PRODUCT_DESIGN_REQUIREMENTS.md) §9 | [design-inspiration/](../design-inspiration/) |

## Code = enforced template

```ts
import { colors, typography, spacing, radius } from "@/constants/tokens";
import { pressScaleStyle } from "@/lib/pressFeedback";
```

Import tokens — don’t hardcode hex in new screens. Existing screens may still have literals; converge when you touch a file.

## Current focus (2026-06)

- **Light theme first** — onboarding, sign-in, browse surfaces documented and designed in light mode.
- **Dark edit surfaces** — editor / export / share remain as shipped; dark tokens stay in code, full dark catalog deferred.
