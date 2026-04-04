# Phase 3a: Project Quick Actions (Delete First)

```
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Design References: docs/design-inspiration/delete-project/
Current phase: Phase 3
Focus: Project Quick Actions

## Goal

Add a lightweight project-actions interaction from Home/Projects cards with a production-safe delete flow.

This pass implements:
- quick actions entry point per project card
- actions sheet with Rename, Duplicate, Delete options
- destructive confirm before delete
- ownership-checked backend mutation that removes the project metadata record

This pass does NOT require full rename/duplicate behavior yet; those can be placeholders as long as delete is complete and robust.

## Prerequisites

Phase 2 flows are stable (auth, onboarding, create, project history, profile).

Before coding, run the Preflight Checklist from Agent Design Section 3.1 and follow Plan -> Implement -> Verify -> Refactor -> Update PRD.

## Step 1 - Backend Delete Mutation

Files:
- convex/projects.ts

Requirements:
- Add a mutation to delete a project by `projectId`
- Enforce auth + ownership (same user who owns project)
- Return a minimal success payload
- Keep behavior idempotent-safe (clear error if project not found)

Suggested function name:
- `projects.remove`

## Step 2 - Home Card Quick Actions UI

Files:
- app/(tabs)/index.tsx

Requirements:
- Add a project-level quick action entry point from each card
- Show an Edits-inspired lightweight actions surface with:
  - Rename
  - Duplicate
  - Delete (destructive color)
- Include the selected project thumbnail above or within the actions surface
- Allow dismiss by tapping outside

Implementation notes:
- Keep list scrolling performance stable
- Do not regress existing card tap-to-open behavior
- Prefer simple, native-feeling interaction over heavy custom animation

## Step 3 - Delete Confirmation and Execution

Files:
- app/(tabs)/index.tsx

Requirements:
- Tapping Delete opens a destructive confirm dialog
- Copy should clearly communicate data loss for that project
- On confirm, call `projects.remove`
- Show in-progress state to prevent duplicate taps
- On success, project disappears from list without manual app restart
- On failure, show actionable error alert and keep user in control

## Step 4 - Analytics

Files:
- src/lib/analytics.ts
- app/(tabs)/index.tsx

Track events:
- `project_actions_opened`
- `project_delete_started`
- `project_deleted`

Keep naming consistent with existing analytics conventions.

## Step 5 - Guardrails and Scope

- Delete should remove Convex project metadata only.
- Local media file cleanup is optional and can be deferred if risky.
- Rename and Duplicate may show "coming soon" messaging in this pass.
- Keep this phase focused; do not expand into full project management workflows yet.

## Step 6 - Verification + QA Script

Manual QA:
1. Open Home with at least one project card.
2. Open card actions and confirm Rename/Duplicate/Delete options are visible.
3. Tap outside actions and confirm it dismisses.
4. Tap Delete and then Cancel in confirmation; ensure project remains.
5. Tap Delete and confirm deletion; ensure card is removed immediately.
6. Repeat delete on another project; verify no crashes and no stale card state.
7. Confirm `project_actions_opened`, `project_delete_started`, `project_deleted` in PostHog.

## Step 7 - Documentation Updates

After implementation, update:
- docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
- docs/requirements/AGENT_DESIGN_REQUIREMENTS.md (Decisions Log)

Document:
- adopted delete interaction pattern
- current scope (delete complete, rename/duplicate staged)
- analytics contract for project actions
```
