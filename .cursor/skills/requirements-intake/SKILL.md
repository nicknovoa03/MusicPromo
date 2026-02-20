---
name: requirements-intake
description: Conducts a structured multi-round product requirements interview and produces a PRD, Agent Design Requirements, and JSON summary. Use when the user wants to define requirements for a new app or feature, do a product intake, or asks to interview for requirements.
---

# Requirements Intake Interview

Conduct a 7-round product requirements interview, then produce three deliverables.

## Templates (read these first)

Before starting, read the following files to understand the interview protocol and output formats:

1. [Interview prompt and rules](docs/templates/REQUIREMENTS_INTAKE_PROMPT.md) — the full interview flow, rules, and checkpoint format
2. [PRD template](docs/templates/PRODUCT_DESIGN_REQUIREMENTS_TEMPLATE.md) — output format for the Product Design Requirements
3. [Agent Design Requirements template](docs/templates/AGENT_DESIGN_REQUIREMENTS_TEMPLATE.md) — output format for the G3 (Guideline/Guidance/Guardrails) doc

## Output Location

Write all generated deliverables to `docs/example/`:

| File | Contents |
|------|----------|
| `docs/example/PRODUCT_DESIGN_REQUIREMENTS.md` | Filled-out PRD |
| `docs/example/AGENT_DESIGN_REQUIREMENTS.md` | Filled-out Agent Design Requirements |
| `docs/example/summary.json` | Compact JSON summary (entities, screens, epics, etc.) |

Do **not** modify the templates in `docs/templates/`. Those are reusable blanks.

## Workflow

1. Read `docs/templates/REQUIREMENTS_INTAKE_PROMPT.md` in full.
2. Follow the interview flow exactly as specified (Rounds 1-7), including all rules, checkpoint format, assumption tracking, and the escape hatch for simple apps.
3. After each round, produce the checkpoint summary and wait for user confirmation before continuing.
4. After Round 7's final validation, write the three deliverable files to `docs/example/`.
5. Confirm the files were written and summarize any remaining open questions.

## Key Rules (from the intake prompt)

- Batch questions: 10 or fewer per round.
- Prefer concrete choices (2-4 options) over open-ended questions.
- Unknown answers get a reasonable default marked as an explicit assumption.
- Maintain a running Assumptions List, reviewed in Round 7.
- Each round (after Round 1) opens with a recap of the previous round.
- Checkpoints use tables/bullets — scannable, not walls of text.
- Reference workspace files when proposing architecture or implementation.
