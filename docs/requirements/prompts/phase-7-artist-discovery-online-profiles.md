# Phase 7: Artist Discovery + Online Profiles

```text
Project: MusicPromo
Stack: React Native + Expo, Clerk, Convex, PostHog
PRD: docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md
Agent Design: docs/requirements/AGENT_DESIGN_REQUIREMENTS.md
Planning Spec: docs/requirements/ARTIST_DISCOVERY_ONLINE_PROFILES.md
Current phase: Phase 7
Focus: Add public artist search, read-only public artist profiles, and owner-managed showcase media while preserving the current create/export core.

## Prerequisites

- Phase 5/6 create, profile, and export flows are stable enough that online discovery can be added without destabilizing the core promo-maker path.
- The team agrees the first discovery slice is not a full social network: no comments, DMs, follower counts, algorithmic feed, label marketplace, or booking payments.
- A storage decision is required before public set-highlight uploads ship. Do not add a new storage dependency without explicit approval.

Before coding:
- Run the Preflight Checklist in `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md` Section 3.1.
- Read `docs/requirements/ARTIST_DISCOVERY_ONLINE_PROFILES.md`.
- Inspect `convex/schema.ts`, `convex/users.ts`, `app/(tabs)/_layout.tsx`, `app/(tabs)/profile.tsx`, and the current analytics helper.
- Preserve existing Home, Create, Profile, project history, and export behavior.

## Goal

Turn MusicPromo into a lightweight online artist presence platform by adding a Search tab, safe public profile queries, read-only public artist pages, and an owner-managed showcase surface for public promos and future set highlights.

## Scope

In scope:
- Public-profile opt-in and unpublish flow
- Search tab with public artist results
- Read-only public artist profile route
- Public profile fields: artist name, handle, avatar, hero, bio, links, city, genres/tags
- Showcase media model and owner visibility controls
- Public selection of exported MusicPromo promos where media is actually available for public display
- Analytics events for search/profile/media interactions
- Minimal report hooks for public profiles/media

Out of scope:
- DMs, comments, likes, follower counts, and For You feed
- Label marketplace or booking transactions
- Direct Instagram/TikTok ingestion
- Cloud rendering or changes to the video export engine
- New dependencies unless Nick approves them first

## Execution Tickets (Recommended Order)

Run Phase 7 as five shippable slices:
1. `7a-schema-privacy-foundation`
2. `7b-search-tab`
3. `7c-public-artist-profile`
4. `7d-showcase-manager`
5. `7e-set-highlight-upload-storage-spike`

Each ticket must be independently verifiable and must update documentation when behavior changes.

## Step 1 - Schema and Privacy Foundation

Files:
- `convex/schema.ts`
- `convex/users.ts`
- New `convex/search.ts`
- New `convex/showcaseMedia.ts`
- Optional new `convex/reports.ts`

Requirements:
- Add public profile publication fields to `users` or a dedicated public profile table:
  - `handle`
  - `isPublicProfile`
  - `publicProfilePublishedAt`
  - `city`
  - `genres`
  - `searchText`
  - `updatedAt`
- Add safe indexes for handle lookup and public-search query paths.
- Add `showcaseMedia` table with owner, media type, title, caption, URIs, optional `sourceProjectId`, visibility, ordering, timestamps, and indexes by user/visibility/order.
- Add `shows` table only if building the booking-credit surface in this pass; otherwise leave it documented but not implemented.
- Add `reports` table or mutation skeleton if public profile/report UI is included.
- Public queries must return a sanitized DTO, never raw user documents.
- Public queries must never return email, Clerk ID, push tokens, notifications, private project records, private media, or local-only URIs.

Acceptance criteria:
- A signed-in owner can publish/unpublish public profile state through Convex mutations.
- Guest users are blocked from public publication.
- Public profile lookup by handle returns only safe public fields.
- Search query is bounded/paginated and uses indexes or an intentional normalized-search strategy.

## Step 2 - Search Tab

Files:
- `app/(tabs)/_layout.tsx`
- New `app/(tabs)/search.tsx`
- Analytics helper, if event constants are centralized

Requirements:
- Add Search to the bottom tab bar without breaking Home, Create, or Profile.
- Preferred order: Home, Search, Create, Profile.
- Implement search input with debounced or explicit-submit behavior.
- Implement empty, loading, error, no-results, and results states.
- Result cards should show avatar, artist name, handle, city, genre chips, short bio, and optional highlight count/thumbnail if available.
- Tapping a result navigates to the public profile route.
- Track `search_viewed`, `artist_search_submitted`, and `artist_search_result_tapped`.

Acceptance criteria:
- Existing tab navigation still works.
- Search results only include opted-in public profiles.
- No result exposes private fields.

## Step 3 - Public Artist Profile

Files:
- New `app/artists/[handle].tsx` or selected route equivalent
- Shared profile display components if useful
- `convex/users.ts`
- `convex/showcaseMedia.ts`

Requirements:
- Build a read-only public profile page using the existing hero-first profile visual language.
- Show hero image, avatar, artist name, handle, city, genres, bio, external links, public promos/highlights, and empty-media state.
- Add share-profile action if low-risk.
- Add report action if the reports mutation exists.
- External links must use the existing supported profile link platforms.
- Track `public_profile_viewed`, `public_profile_link_tapped`, and `showcase_media_opened`.

Acceptance criteria:
- A viewer can open another artist from Search.
- Private/unpublished profiles show a safe not-available state.
- Public page never exposes owner-only controls to non-owners.

## Step 4 - Showcase Manager

Files:
- `app/(tabs)/profile.tsx`
- New `app/profile/showcase.tsx` or nested Profile surface
- `convex/showcaseMedia.ts`
- `convex/users.ts`

Requirements:
- Add an owner-only entry point from Profile: `Public Profile` or `Showcase`.
- Let the owner edit publication fields: handle, city, genres, bio/links if not already covered in Profile.
- Let the owner publish/unpublish the profile.
- Let the owner add, remove, reorder, and change visibility of showcase media.
- For exported promos, only publish media that can be safely displayed publicly. If the current asset is local-only and not uploaded, show a blocking explanation rather than publishing a broken URI.
- Track `public_profile_published`, `public_profile_unpublished`, `showcase_media_published`.

Acceptance criteria:
- Public profile visibility can be reversed.
- Media visibility can be changed without deleting the underlying project.
- Owner-only controls do not appear on public viewer pages.

## Step 5 - Set Highlight Upload Storage Spike

Files:
- Storage adapter location TBD after decision
- `convex/showcaseMedia.ts`
- Showcase manager UI

Requirements:
- Do not add new storage dependencies until Nick approves the provider.
- Evaluate the minimum viable upload flow for short set highlights:
  - file picker or camera roll picker
  - max duration/size
  - thumbnail generation or selection
  - upload progress
  - deletion/unpublish behavior
  - public playback behavior
- Keep this spike separate from Search/Profile if storage is not yet decided.

Acceptance criteria:
- A small highlight can be uploaded, displayed publicly, unpublished, and deleted.
- Upload errors are recoverable and never leave a broken public media item.

## QA Contract

Manual test script:
1. Existing create flow: create a promo, export, save/share, verify no regression.
2. Existing Home: project list, reopen project, multi-select delete still works.
3. Existing Profile: edit avatar/hero/name/bio/links; sign out/delete account paths still work.
4. Publish profile as signed-in user with required fields.
5. Confirm a guest user cannot publish into public search.
6. Search for the published artist from another account/session.
7. Open public artist profile and verify only public fields/media appear.
8. Unpublish the profile and confirm it disappears from Search and profile route becomes unavailable.
9. Publish/unpublish one showcase item and verify public visibility changes.
10. Run lint/typecheck and iOS smoke test.

## Documentation Updates

After implementation, update:
- `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`
- `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md`
- `docs/requirements/summary.json`
- This prompt if execution order or storage decision changes

## Acceptance Criteria (Must Pass)

- Search tab exists and does not regress existing tabs.
- Public profile publication is explicit and reversible.
- Public profile queries return sanitized data only.
- Search returns only opted-in public profiles.
- Public artist pages are read-only to viewers.
- Showcase media visibility is owner-controlled.
- No new dependency is introduced without approval.
- Existing create/export/share path remains stable.
```
