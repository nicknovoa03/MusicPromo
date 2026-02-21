# Product Design Requirements (Template)

Use this as the shared "source of truth" for humans and agents. Optimize for clarity over completeness.

## Doc Metadata

- Product name:
- Doc owner:
- Stakeholders:
- Last updated (YYYY-MM-DD):
- Version:
- Links: Figma, Linear, GitHub, analytics, etc.

## 1) Product Summary

- One-liner:
- Problem statement:
- Target users (1-3 personas):
- Core job-to-be-done (JTBD):
- What is "success" for v1:
  - North star:
  - Input metrics:
  - Guardrails:

## 2) Goals, Non-Goals, and Principles

- Goals (v1):
- Non-goals (v1):
- Product principles (3-7):
  - Example: "Mobile-first, fast, and forgiving"
  - Example: "Social without pressure"

## 3) Platform, Tech, and Operational Constraints

- Platforms:
  - iOS:
  - Android:
  - Web (optional):
- Authentication:
  - Provider:
  - Required identity fields:
- Backend:
  - Data store:
  - Realtime needs:
  - File/media storage:
- Environments:
  - Local:
  - Staging:
  - Production:
- Safety rails:
  - Destructive ops gating:
  - Admin tooling needs:
- Accessibility:
  - WCAG target (if web):
  - Screen reader expectations (if mobile):
- Privacy/security/compliance:
  - PII handled:
  - Data retention:
  - Age gating / COPPA / GDPR (if relevant):

## 4) Information Architecture and Navigation

- Global navigation pattern:
  - Tabs / sidebar / single feed / etc:
- Global primary action:
  - FAB / plus button / create menu:
- App-level routes/screens (list):
  - Screen:
  - Purpose:
  - Entry points:
  - Exit points:

## 5) Core Entities (Conceptual Data Model)

List the nouns of the product and their relationships. Keep this conceptual; implementation details live elsewhere.

For each entity:
- Entity name:
- Owner:
- Visibility (private, friends, public):
- Key fields (required vs optional):
- Relationships:
- Typical queries:
- Permissions rules:

Example entity list (edit/remove):
- User
- Post
- Comment
- Reaction
- Notification
- Event
- RSVP
- Group
- Settings
- Push token
- Analytics/interaction log

## 6) Feature Requirements (By Epic)

For each epic, fill this block.

### Epic: <Name>

- User problem:
- Primary user story:
- Secondary stories:
- Scope (v1):
- Non-goals:
- Key screens/components:
- Backend/data needs:
- Permissions/abuse risks:
- Analytics/events:
- Acceptance criteria (testable):
- States:
  - Loading:
  - Empty:
  - Error:
  - Signed-out:
  - Edge cases:

## 7) Screen Requirements (Design Spec)

Define what each screen must include and how it behaves. Prefer explicit states and interaction details.

For each screen:
- Screen name / route:
- Primary intent:
- Header elements:
- Main sections:
- Primary CTA:
- Secondary actions:
- List behavior:
  - Pagination/infinite scroll:
  - Pull to refresh:
- Empty/loading/error states:
- Accessibility notes:
- Analytics to fire:

## 8) Interaction Flows

Describe critical flows end-to-end. Use bullets, sequence steps, and include fallback states.

Examples:
- Sign in -> first meaningful action
- Create -> publish -> appears in feed
- Search -> results -> detail -> action
- Notification -> deep link -> mark read

## 9) Visual Design Requirements (Mini Design System)

- Brand adjectives:
- Color tokens:
  - Background:
  - Surface:
  - Primary CTA:
  - Text:
  - Status (success/warn/error):
- Typography:
  - Font family:
  - Type scale (H1/H2/body/caption):
- Components (required):
  - Buttons:
  - Cards:
  - Chips/filters:
  - Sheets/modals:
  - Tabs:
  - Inputs:
  - Toasts:
- Motion:
  - Where it matters (page transitions, sheets, list insertions):
  - Reduce motion support:

## 10) Content Design

- Tone:
- Voice do/don't:
- Key empty states copy (draft):
- Error message guidelines:

## 11) Instrumentation and Analytics

- Event taxonomy (names + fields):
- "Meaningful actions" to track:
- Logging for debugging vs product analytics:
- A/B testing needs (if any):

## 12) Performance and Quality Bars

- Cold start target:
- "Time to first content" target:
- Scrolling/jank budget:
- Media guidelines:
  - Image sizes:
  - Video handling:
- Offline / poor network expectations:
- Rate limits / spam prevention (if needed):

## 13) Risks and Open Questions

- Known risks:
- Open questions:
- Decisions needed (with owners/dates):

## 14) Phasing and Milestones

- Phase 0 (bootstrap):
- Phase 1 (MVP):
- Phase 2:
- Deferred ideas:

## Appendix A: Implementation Notes (Optional)

- Proposed API surface (queries/mutations/endpoints):
- Data indices required:
- Seed/demo data requirements:
- Migration plan (if replacing an old app):

