# Claude Design → Coding Agent Handoff

A general workflow for solo devs: **spec + design system → wireframes in Claude Design → implementation in your coding agent** (Cursor, Codex, etc.). No Figma required.

## Three layers

| Layer | What it is | Who owns it |
|-------|------------|-------------|
| **Constraints** | Brand, tokens, scope, out-of-scope | You (docs) |
| **Screen spec** | Steps, copy, states, CTAs | You (requirements) |
| **Implementation** | Components + tokens in code | Coding agent |

Design output should use the **same vocabulary** as engineering: components, states, tokens — not vague “make it premium.”

---

## Workflow

1. **Write a 1-page screen spec** — copy, layout regions, states, primary CTA per screen.
2. **Paste spec + design rules into Claude Design** — use the prompt below.
3. **Paste wireframes + the same spec into your coding agent** — use the implementation prompt below.
4. **Ship** — update design docs and `tokens.ts` when you add tokens; add rows to `COMPONENTS.md` when you ship reusable UI.

---

## Prompt — Claude Design (wireframes)

Copy and fill in the bracketed fields.

```text
You are designing UI wireframes for a [platform: iOS app / web app / etc.].

INPUTS I WILL PROVIDE:
- Product: [one sentence]
- Screen(s): [names + user goal per screen]
- Copy: [headlines, body, button labels]
- Design system: [colors, type scale, spacing, radius — or “minimal, neutral, light theme”]
- Reference: [apps or screenshots I like, optional]
- Out of scope: [what NOT to design]

OUTPUT FORMAT (required):
For EACH screen, deliver:
1. Wireframe description (layout regions top → bottom)
2. Component list (reusable pieces, not one-off divs)
3. All UI states: default, loading, empty, error, disabled
4. Copy table (element → exact string)
5. Interaction notes (what happens on tap, back, skip)
6. Token mapping (use my design tokens; no invented hex unless marked “new token”)
7. Handoff for engineering: suggested file/component names and props

RULES:
- Mobile-first unless I say otherwise
- One primary CTA per screen
- No lorem ipsum — use my copy or mark [TBD]
- Do not invent features not in the spec
- Prefer simple, shippable layouts over marketing fluff
- End with an “Implementation checklist” for the coding agent

Start by confirming what you understood, then design screen 1.
```

---

## Prompt — Coding agent (implementation)

Use after Claude Design returns wireframes. Attach the **same spec** and design system docs.

```text
Implement the attached wireframes using [stack: React Native / Next.js / etc.].

Source of truth order:
1. Screen spec + copy
2. Design system tokens
3. Wireframe component breakdown

Reuse before creating new components. Match spacing and type scale exactly.
List any ambiguities before writing code.
```

---

## What to attach (per project)

**Design agent**

- Design system README + brand guide + token spec
- Feature requirements for the screen(s) you’re building
- Final copy (per step / per screen)
- Reference screenshots (optional)
- Out-of-scope note (what not to design)

**Coding agent**

- Everything above, plus
- Wireframe output from Claude Design
- Existing component catalog (what’s already shipped)
- Reference implementation files for patterns to mirror

---

## Instagram / shareable one-liner

> I don’t wireframe in Figma first. I write a one-page spec, run it through Claude Design for structured wireframes, then hand the same spec + output to my coding agent. The trick is forcing **components, states, and tokens** — not “make it pretty.”

Optional carousel hook: **Spec → Claude Design → Coding agent → Ship.**

---

## MusicPromo example

For this repo’s onboarding flow, attach:

- `docs/design-system/` (README, BRAND_GUIDE, DESIGN_SYSTEM, COMPONENTS)
- `src/constants/tokens.ts`
- `docs/requirements/ONBOARDING_REQUIREMENTS.md`
- `docs/design-assets/onboarding-workflow/copy.md`
- `src/components/onboarding/` and `ShareCardPreview.tsx` as reference

See also [`../design-assets/onboarding-workflow/README.md`](../design-assets/onboarding-workflow/README.md).
