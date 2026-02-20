# Prompt Requirements Document (Template)

This is an AI-first companion to a traditional PRD. It is designed to:

- stay close to implementation reality,
- be easy for humans to skim,
- be easy for agents to execute.

Organized using the G3 model:

- Guideline: shared context and decisions
- Guidance: prompt programs and how to evolve them
- Guardrails: checks that prevent drift and regressions

## Doc Metadata

- Project / repo:
- Product name:
- Owners:
- Date:
- Version:
- Links: PRD, Figma, tickets, API docs, analytics dashboards

## 1) Guideline (Shared AI-Human Understanding)

### 1.1 Product Summary

- One-liner:
- Target users:
- Primary value:
- Definition of v1 "done":
- Non-goals:

### 1.2 Current State (If Existing)

- What exists today:
- Known gaps:
- Known tech debt:

### 1.3 Constraints and Invariants

- Platforms:
- Timeline:
- Tech constraints (must use / must not use):
- Data/privacy constraints:
- Invariants (non-negotiables):
  - Example: "Auth required for any write"
  - Example: "No destructive mutations without env gating"

### 1.4 System Map

- Key entities (nouns):
- Navigation model:
- Critical flows (top 3):
- Integrations (auth, payments, maps, notifications, etc.):

### 1.5 Decisions Log

Record decisions as they happen so future agents don't re-litigate them.

- YYYY-MM-DD: Decision -> rationale -> alternatives rejected

## 2) Guidance (Methodology for Evolving Prompts)

This section is the "prompt program": a small set of reliable starting prompts + patterns.

### 2.1 Context Packaging Rules

- Always include:
  - The relevant part of the PRD (or excerpt)
  - The relevant code surface (files/modules)
  - The success criteria + acceptance tests
- Never include:
  - Entire repo dumps
  - Large irrelevant logs
- When context is missing:
  - Ask targeted questions
  - Propose defaults and label as assumptions

### 2.2 Standard Workflows (Choose One)

- Plan -> Implement -> Verify -> Refactor -> Update PRD
- Spike -> Extract learnings -> Decide -> Implement
- Debug -> Reproduce -> Fix -> Prevent (test/guardrail)

### 2.3 "Starting Prompts" (Copy/Paste)

#### A) Requirements-to-Spec Prompt

Goal: turn an idea into a scoped v1 PRD section + acceptance criteria.

Input:

- App idea (1-3 sentences)
- Constraints

Output:

- Features (v1) + non-goals
- Entities
- Screens/routes
- Acceptance criteria + edge cases

#### B) Architecture Prompt

Goal: propose a minimal architecture consistent with constraints.

Output:

- Data model
- API surface (queries/mutations)
- Storage strategy (media)
- Auth/permissions rules

#### C) UI Prompt

Goal: propose screen-level requirements and interaction flows.

Output:

- Screen specs (states: loading/empty/error/signed-out)
- Component list
- Motion and accessibility notes

#### D) Implementation Task Prompt

Goal: convert spec into a short task list suitable for an agent.

Output:

- 3-7 steps, each independently verifiable
- Files likely to change
- Local test commands

### 2.4 Prompt Patterns

- Always request machine-readable outputs:
  - JSON summaries, checklists, acceptance criteria tables
- Always separate:
  - assumptions vs facts,
  - v1 vs deferred,
  - "must" vs "nice to have".
- For long projects:
  - create a short "context header" that can be reused each session

## 3) Guardrails (AI-Assisted Reviews and Quality Gates)

### 3.1 Preflight Checklist (Before Coding)

- Confirm v1 scope and non-goals
- Confirm entities + permissions
- Confirm routes/screens affected
- Confirm acceptance criteria exists and is testable

### 3.2 Code Review Checklist (Per PR)

- Correctness:
  - Matches acceptance criteria
  - Handles empty/loading/error states
- Security/privacy:
  - Auth checks on writes
  - PII handling consistent
- Data integrity:
  - Indexes for queries that will scale
  - No accidental scans on hot paths
- UX quality:
  - Good defaults, no dead ends
  - Accessible focus / screen reader labels (where applicable)
- Performance:
  - Avoid unbounded lists
  - Media sizing and caching rules

### 3.3 Regression Tests (Minimum)

- Unit tests (if present):
- Integration tests (if present):
- Manual test script:
  - Steps:
  - Expected results:

### 3.4 Drift Controls

- Stop conditions:
  - If requirements are unclear, pause and ask
  - If scope expands, propose a phase split
- Update loop:
  - After implementing a feature, add learnings back into this document
