# Show Flyer — Design Reference

Extracted from the Anthropic design package (`musicpromo-design-system`).

## Source files

| Path | Contents |
|------|----------|
| `project/Flyer Workflow Design.html` | Interactive mid-fi: browse → details → editor → export |
| `project/Flyer Design System.html` | Field schema, lineup system, template anatomy |
| `project/flyer-templates.jsx` | Heat, Iridescent, Vintage template JSX |
| `project/flyer-screens.jsx` | Screen layouts (light browse, dark editor) |

## App implementation

- Routes: `app/create/flyer/details`, `editor`, `export`
- Requirements: `docs/requirements/SHOW_FLYER_REQUIREMENTS.md`
- Components: `src/components/flyer/`
- Draft state: `src/providers/FlyerDraftContext.tsx`, `src/lib/flyerDraft.ts`
