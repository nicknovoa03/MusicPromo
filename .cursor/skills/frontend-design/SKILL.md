---
name: frontend-design
description: Designs and implements React Native + Expo screens and components from PRD specs. Use when the user asks to build a screen, create UI components, implement a design system, lay out navigation, or translate product requirements into frontend code.
---

# Frontend Design

Design and implement screens, components, and navigation for a React Native + Expo app based on product requirements.

## Prerequisites

Before designing any UI, read the relevant project docs:

1. [Product Design Requirements](docs/example/PRODUCT_DESIGN_REQUIREMENTS.md) — screen specs, entities, flows, visual design tokens
2. [Agent Design Requirements](docs/example/AGENT_DESIGN_REQUIREMENTS.md) — constraints, invariants, system map

If these don't exist yet, prompt the user to run the **requirements-intake** skill first.

## Workflow

### Phase 1: Scope the Work

1. Identify which screen(s) or component(s) the user wants built.
2. Cross-reference against PRD sections:
   - **Section 4** (IA / Navigation) — where does this screen live?
   - **Section 7** (Screen Requirements) — what elements, CTAs, and states are specified?
   - **Section 9** (Visual Design) — color tokens, typography, component styles
3. List unknowns and confirm with the user before proceeding.

### Phase 2: Design the Component Tree

Propose a component breakdown before writing code:

```
ScreenName/
├── ScreenName.tsx          # Screen container, data fetching, state
├── components/
│   ├── Header.tsx
│   ├── ContentList.tsx
│   └── ActionButton.tsx
└── __tests__/
    └── ScreenName.test.tsx
```

Guidelines:
- One file per component; co-locate screen-specific components.
- Shared components go in a top-level `components/` directory.
- Keep screens thin — delegate layout and logic to child components.

### Phase 3: Implement

Follow this order for each screen:

1. **Static layout** — structure and styling with placeholder data
2. **States** — loading, empty, error, signed-out (all four required)
3. **Interactivity** — handlers, navigation, gestures
4. **Data integration** — connect to real data sources
5. **Polish** — animations, accessibility labels, edge cases

### Phase 4: Verify

Run through this checklist before considering a screen done:

- [ ] All four states render correctly (loading / empty / error / signed-out)
- [ ] Primary CTA is prominent and functional
- [ ] Screen is reachable from the navigation structure
- [ ] Accessibility: labels on touchables, adequate contrast, no text below 14px
- [ ] No hardcoded strings (extract to constants or i18n)
- [ ] Matches PRD Section 9 design tokens (colors, type scale, spacing)
- [ ] Works on both iOS and Android (test with Expo Go)

## Styling Conventions

Use `StyleSheet.create` for all styles. Follow this token structure derived from PRD Section 9:

```javascript
const tokens = {
  color: {
    background: '#___',
    surface: '#___',
    primaryCta: '#___',
    text: '#___',
    textSecondary: '#___',
    success: '#___',
    warning: '#___',
    error: '#___',
  },
  type: {
    h1: { fontSize: 28, fontWeight: '700' },
    h2: { fontSize: 22, fontWeight: '600' },
    body: { fontSize: 16, fontWeight: '400' },
    caption: { fontSize: 13, fontWeight: '400' },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  radius: {
    sm: 6,
    md: 12,
    lg: 20,
    full: 9999,
  },
};
```

Fill token values from the PRD's visual design section. If no design system exists yet, propose one and confirm with the user.

## Navigation

Use Expo Router (file-based routing) or React Navigation depending on project setup. When adding a new screen:

1. Create the route/file in the correct location.
2. Register it in the navigator if using React Navigation.
3. Add navigation links from relevant entry points (per PRD Section 4).
4. Handle deep linking if the screen is a notification target (per PRD Section 8).

## State Patterns

For each screen state, follow these patterns:

| State | Pattern |
|-------|---------|
| **Loading** | Centered `ActivityIndicator` or skeleton placeholders |
| **Empty** | Illustration + descriptive copy + primary action CTA |
| **Error** | Error message + retry button; log the error |
| **Signed-out** | Redirect to auth or show gated content prompt |

Empty and error copy should follow the tone defined in PRD Section 10.

## Component Conventions

- **Touchables**: Use `Pressable` with visual feedback (`opacity` or `scale`).
- **Lists**: Use `FlatList` or `SectionList` with `keyExtractor`. Support pull-to-refresh where specified.
- **Images**: Use `expo-image` for caching and progressive loading.
- **Icons**: Use `@expo/vector-icons` or a project-specific icon set.
- **Forms**: Controlled components with inline validation. Show errors below the field.

## Accessibility

Every screen must include:
- `accessibilityLabel` on all interactive elements
- `accessibilityRole` where semantics aren't obvious
- Minimum touch target of 44x44 points
- Support for `reduceMotionEnabled` when using animations

## Output Expectations

When building a screen, produce:
1. The screen file and any new child components
2. Updated navigation configuration (if needed)
3. A brief summary of decisions made and any deviations from the PRD
