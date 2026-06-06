# Brand Guide Workflow

How to create a **brand guide** before wireframes or code — using a short intake + Claude (or any LLM), then locking it in `BRAND_GUIDE.md`.

**Order of operations:** Brand guide → design tokens (`DESIGN_SYSTEM.md` + `tokens.ts`) → screen specs → [Claude Design wireframes](./CLAUDE_DESIGN_HANDOFF.md) → coding agent.

---

## What a brand guide is (and isn’t)

| Brand guide | Design system |
|-------------|---------------|
| Voice, personality, do/don’t | Hex values, type scale, spacing |
| Who the product is for | How buttons and lists are built |
| Logo rules, reference apps | Component catalog |
| Color *personality* (e.g. “neutral, no purple SaaS”) | Color *tokens* (e.g. `#111111`) |

The brand guide answers **“should this feel right?”** The design system answers **“what exact values do I use?”**

---

## Workflow

1. **Fill the intake** (below) — 15–20 minutes; rough answers are fine.
2. **Run the generation prompt** — get a draft `BRAND_GUIDE.md`.
3. **Edit ruthlessly** — you own taste; cut generic adjectives and buzzwords.
4. **Save** as `docs/design-system/BRAND_GUIDE.md` (or your project’s equivalent).
5. **Derive tokens** — run the design-system prompt; update `DESIGN_SYSTEM.md` and code.
6. **Collect references** — drop screenshots in `docs/design-inspiration/` with one-line notes.
7. **Use on every screen** — wireframe and coding prompts both cite the brand guide.

Revisit the brand guide when positioning changes, not on every feature.

---

## Intake (fill before prompting)

Copy this and answer in plain language:

```text
PRODUCT
- One-liner (what it does, for whom):
- Primary user (job title / vibe, not demographics spreadsheet):
- Main job-to-be-done in one sentence:

PERSONALITY
- 3–5 adjectives (e.g. clean, playful, serious):
- What we are NOT (e.g. not corporate, not childish):
- Reference apps or sites (2–4) and what to borrow from each:

VOICE
- How should buttons and headlines sound? (direct / warm / technical):
- Words we avoid:
- Emoji in product UI? (yes/no — marketing only?)

VISUAL
- Light-first, dark-first, or both?
- Accent color idea (or “neutral B&W only”):
- Any accent restrictions (e.g. gradient only for Instagram share)?
- Logo/icon status (have assets / need simple wordmark / TBD):
- Photography: user content only / illustrations OK / stock never?

SCOPE
- Platform: iOS / Android / web / etc.
- v1 surfaces to nail first (e.g. onboarding, home, editor):
- Out of scope for brand (features we’re not claiming yet):
```

---

## Prompt — Generate brand guide

```text
You are a product brand strategist helping a solo developer create a practical BRAND GUIDE for an app — not a 40-page agency deck.

I will provide an intake. Produce a markdown brand guide a coding agent and design agent can follow.

OUTPUT: Full markdown document with these sections (use my product name in the title):

1. One-liner
2. Brand adjectives (table: adjective → what it means in UI)
3. Voice & tone (bullets: do + avoid)
4. Logo & icon (table: asset | path placeholder | usage) — use [TBD] if unknown
5. Reference products (table: app | what to borrow)
6. Photography & illustration rules
7. Color personality (not hex yet — e.g. “high-contrast neutral, one restricted gradient”)
8. Theme strategy (light-first / dark editor / etc.)
9. Do / don’t (table, UI-specific — not generic “be consistent”)
10. Related docs (placeholder links to design system + requirements)

RULES:
- Be specific to my product and user — no filler adjectives
- Every adjective must map to a visible UI decision
- Voice examples: show good vs bad copy for one button and one headline
- Do/don’t must be actionable for engineers (press states, CTAs, loading, permissions, etc.)
- Keep it under ~120 lines — shippable doc, not marketing fluff
- If intake is vague, ask up to 3 clarifying questions first, then draft

INTAKE:
[paste intake here]
```

---

## Prompt — Brand guide → design system

Run after you approve the brand guide. Feeds `DESIGN_SYSTEM.md` and `tokens.ts`.

```text
Using the attached BRAND_GUIDE.md, produce a minimal DESIGN SYSTEM spec for [platform / stack].

OUTPUT:
1. Theme table (which surfaces are light vs dark)
2. Color tokens (light + dark if needed) — hex values that match color personality
3. Typography scale (roles: h1, h2, body, caption, button — size + weight)
4. Spacing scale (4–6 steps)
5. Radius scale
6. Motion rules (press scale, animation duration — keep minimal)
7. Restricted colors (e.g. brand gradient — where allowed / forbidden)
8. “New screen checklist” (5–8 bullets)

RULES:
- Prefer a small token set a solo dev can maintain
- No new colors unless justified by brand guide
- Map every token to a use case
- End with a TypeScript `tokens` object sketch matching the spec

Do not design individual screens — tokens only.
```

---

## Prompt — Review / tighten existing brand guide

```text
Review this brand guide for a solo-built app. Be harsh.

Check:
- Generic adjectives with no UI meaning
- Voice rules without examples
- Do/don’t that engineers can’t enforce
- Missing theme strategy (light vs dark)
- Conflicts with reference products

Output:
1. Top 5 cuts or rewrites (quote → replacement)
2. 3 missing rows for do/don’t table
3. One sample onboarding headline in brand voice
4. Final verdict: ready for design system / needs another pass

BRAND GUIDE:
[paste BRAND_GUIDE.md]
```

---

## Brand guide template (save as BRAND_GUIDE.md)

```markdown
# [Product] — Brand Guide

Doc owner: [name]
Last updated: [date]

## 1. One-liner

## 2. Brand adjectives

| Adjective | Means in UI |
|-----------|-------------|
| | |

## 3. Voice & tone

**Avoid:**

## 4. Logo & icon

| Asset | Path | Usage |
|-------|------|--------|
| | | |

## 5. Reference products

| App | What to borrow |
|-----|----------------|
| | |

## 6. Photography & illustration

## 7. Color personality

## 8. Theme strategy

## 9. Do / don’t

| Do | Don’t |
|----|--------|
| | |

## 10. Related docs

- DESIGN_SYSTEM.md
- COMPONENTS.md
```

---

## What to attach (per step)

| Step | Give the agent |
|------|----------------|
| Generate brand guide | Intake only; optional competitor screenshots |
| Design system | Approved `BRAND_GUIDE.md` |
| Wireframes | Brand guide + design system + screen spec — see [CLAUDE_DESIGN_HANDOFF.md](./CLAUDE_DESIGN_HANDOFF.md) |
| Implement | All of the above + wireframes |

---

## Instagram / shareable one-liner

> Before wireframes: I write a 10-minute intake and let Claude draft my brand guide — voice, UI personality, do/don’t. Then tokens and screens inherit the same rules. Brand guide → design system → Claude Design → coding agent.

---

## MusicPromo example

This repo’s finished guide: [BRAND_GUIDE.md](./BRAND_GUIDE.md).

How it was informed:

- **Neutral B&W UI** + Instagram gradient only on share
- **Edits app** as primary reference (`docs/design-inspiration/`)
- **Creator-first voice** — promos and releases, not “content”
- **Light-first v1** for onboarding and browse; dark editor unchanged

After the brand guide: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md) and `src/constants/tokens.ts`.
