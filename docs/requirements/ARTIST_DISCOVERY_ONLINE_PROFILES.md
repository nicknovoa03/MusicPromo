# Artist Discovery + Online Profiles — Planning Spec

## Doc Metadata

- Product name: MusicPromo
- Doc owner: Nick
- Prepared by: Manus AI
- Last updated (YYYY-MM-DD): 2026-04-28
- Status: Planning / Claude Code handoff
- Related docs: `docs/requirements/PRODUCT_DESIGN_REQUIREMENTS.md`, `docs/requirements/AGENT_DESIGN_REQUIREMENTS.md`, `docs/requirements/summary.json`

## 1) Strategic Intent

MusicPromo should evolve from a **local promo creation utility** into a lightweight **artist presence and discovery platform**. The first version proves the creation workflow: photo plus audio becomes a polished promo video. The next product arc should make those creations useful inside MusicPromo itself by letting artists publish a professional page and letting other users search for artists.

The underlying market problem is that artist discovery for local shows, venue nights, parties, and early label/community opportunities is still fragmented. A venue or promoter often relies on word of mouth or searches Instagram, but Instagram was not designed around booking context, performance credibility, or structured artist presentation. MusicPromo can become the place where an artist makes themselves look professional with less effort, and where a viewer can quickly understand who the artist is, what they sound/look like, and whether they fit an opportunity.

> **Working product thesis:** MusicPromo starts as “CapCut for DJs,” then becomes the professional public profile and discovery layer for DJs and independent artists.

## 2) Product Scope

The first discovery release should be deliberately small. It should not try to become a full social network. It should add search, public artist pages, and owner-controlled showcase media while preserving the existing create/export workflow as the core engine.

| Area | First Slice | Deferred |
|---|---|---|
| Search | Dedicated Search tab, text search by artist name/handle/tags/city, public result cards | Algorithmic feed, advanced ranking, personalized recommendations |
| Public profiles | Opt-in artist page with hero, avatar, name, handle, bio, links, city, genres, promos, highlights | Booking CRM, label marketplace profile tools, profile analytics dashboard |
| Showcase media | Select exported promos for public display; upload short set highlights after storage decision | Long-form video hosting, livestreams, auto-ingestion from Instagram/TikTok |
| Social mechanics | Public viewing and external link taps only | Comments, DMs, likes, follower counts, For You Page, interactions graph |
| Trust/safety | Publication opt-in, report hooks, private-by-default data model | Full moderation console, automated content scanning, dispute workflows |

## 3) Personas and Jobs To Be Done

| Persona | Job To Be Done | Product Need |
|---|---|---|
| Artist / DJ | “When someone searches me or considers booking me, I want one polished page that shows my identity, music links, promos, and live highlights.” | Public profile, showcase manager, media ordering, profile sharing |
| Venue / Promoter / Booker | “When I need an artist for a show or party, I want to search and quickly understand who fits the room.” | Search tab, result previews, public artist pages, genre/city context |
| Label / Curator / Community Builder | “When I discover promising artists, I want enough credible context to decide whether to listen, follow, or reach out elsewhere.” | Bio, links, highlights, shows/credits, external actions |

## 4) Information Architecture

The bottom tab bar should expand from **Home / Create / Profile** to include **Search**. The preferred first layout is **Home / Search / Create / Profile**, because Search is a browsing destination and Create remains the core action. If visual balance or habit testing suggests otherwise, Search can sit between Create and Profile.

| Screen | Route | Purpose | Theme |
|---|---|---|---|
| Search / Discover Artists | `/search` | Search public artists and open result pages | Light browsing |
| Public Artist Profile | `/artists/[handle]` or `/profile/[userId]` | Read-only page for another artist | Dark cinematic profile |
| Artist Showcase Manager | `/profile/showcase` | Owner controls public page and showcase media | Light utility editing |

## 5) Data Model Plan

The current Convex schema already has several artist-facing `users` fields: `artistName`, `avatarImageUrl`, `heroImageUrl`, `bio`, and `links`. The discovery layer should build on these fields, but it should not expose the raw user record publicly. Public search should be backed by explicit publication fields and indexes so private account data is never accidentally returned.

| Table / Entity | Purpose | Key Fields | Indexes / Query Needs |
|---|---|---|---|
| `users` additions | Store owner-controlled publication state and profile metadata | `handle`, `isPublicProfile`, `publicProfilePublishedAt`, `city`, `genres`, `searchText`, `updatedAt` | `by_handle`, `by_public_profile`, possibly `by_public_search_prefix` if using simple normalized search |
| `showcaseMedia` | Public/private media items shown on artist profiles | `userId`, `type`, `title`, `caption`, `mediaUri`, `thumbnailUri`, `sourceProjectId`, `duration`, `visibility`, `sortOrder`, `createdAt`, `updatedAt` | `by_user_visibility_sort`, `by_user_created` |
| `shows` | Artist credibility and booking context | `userId`, `venue`, `date`, `city`, `type`, `description`, `mediaIds`, `visibility`, `createdAt`, `updatedAt` | `by_user_date`, `by_user_visibility_date` |
| `reports` | Minimum public-surface safety hook | `reporterUserId`, `targetType`, `targetId`, `reason`, `details`, `createdAt`, `status` | `by_target`, `by_status_created` |
| Future `follows` / `interactions` | Enables For You Page and later marketplace ranking | `followerId`, `followingId`, `targetId`, `targetType`, `type`, `createdAt` | Defer until feed/social mechanics are approved |

### Storage Decision Required

Public set highlights and thumbnails cannot use local device URIs. Before implementation, Nick should choose a storage path such as Convex file storage if available in the current stack, S3-compatible storage, Cloudflare R2, or another Expo-friendly upload path. The first engineering spike should decide upload limits, thumbnail creation, deletion behavior, and whether transcoding is required.

## 6) Convex Function Plan

| File | Function | Type | Purpose |
|---|---|---|---|
| `convex/users.ts` | `publishPublicProfile` | mutation | Validate required fields, set public profile state, update search fields |
| `convex/users.ts` | `unpublishPublicProfile` | mutation | Remove profile from public search without deleting private data |
| `convex/users.ts` | `getPublicProfileByHandle` | query | Return only safe public fields for a viewer |
| `convex/search.ts` | `searchArtists` | query | Search public artists by normalized text/tags/city with pagination |
| `convex/showcaseMedia.ts` | `listPublicByArtist` | query | Return public media for profile page |
| `convex/showcaseMedia.ts` | `listOwn` | query | Owner view of all media visibility states |
| `convex/showcaseMedia.ts` | `createOrAttach` | mutation | Add media item or attach exported project after storage validation |
| `convex/showcaseMedia.ts` | `updateVisibilityAndOrder` | mutation | Publish, unpublish, reorder media |
| `convex/reports.ts` | `createReport` | mutation | Capture minimum reporting data for public profiles/media |

## 7) UX Requirements

Search should feel like a browsing surface, not a heavy database tool. The empty state should teach the behavior with simple copy such as “Search artists, DJs, genres, or cities.” Results should show enough to make taps meaningful: avatar, artist name, handle, city, genre chips, one-line bio, and optionally a small media count or latest highlight thumbnail.

Public artist profiles should reuse the current hero-first profile direction, but with read-only boundaries for non-owners. The viewer should see the artist’s strongest identity first, followed by links and media. The page should answer four questions quickly: **Who are they? What do they sound/look like? Where are they credible? Where can I follow/listen/contact externally?**

The showcase manager should live under the owner’s Profile area. It should keep public publishing explicit, because this is a major privacy shift from v1. The default state must be private. A user should understand that publishing makes selected profile data and selected media visible to other MusicPromo users.

## 8) Implementation Slices for Claude Code

| Slice | Goal | Deliverable | Verification |
|---|---|---|---|
| 7a — Schema and privacy foundation | Add public profile fields, safe query shapes, and search/media table skeletons | Schema migration, Convex queries/mutations, tests/manual query checks | Public query never returns email, Clerk ID, private project data, or unpublished media |
| 7b — Search tab | Add bottom-tab Search page with text input and public result states | `/search` route, tab icon/label, result list, analytics | Empty/loading/error/no-results/results states work and do not break existing tabs |
| 7c — Public artist profile | Add read-only public profile route and media sections | `/artists/[handle]` route, profile data query, media list, external link handling | Viewer can open another artist profile from Search and see only public data |
| 7d — Showcase manager | Let owner publish profile and control displayed media | Profile entry point, publish toggle, media visibility/order controls | Owner can publish/unpublish and reverse visibility without data loss |
| 7e — Set highlight upload spike | Decide and implement minimal public media storage path | Storage adapter, upload progress/error states, thumbnail policy | A small highlight can be uploaded, displayed publicly, and deleted/unpublished |

## 9) Acceptance Criteria

A first discovery build is acceptable when a signed-in artist can publish a public profile, another user can search for that artist, open the public profile, view only public fields and public showcase media, and tap external links. Guest accounts must not be searchable by default. Email, Clerk IDs, private projects, private local file URIs, push tokens, and notifications must never appear in public query results.

Search must include empty, loading, error, no-results, and results states. Public profiles must include loading, not-found, unpublished/private, and empty-media states. All public list queries must be indexed and paginated or bounded. The existing create/export/share critical path must not regress, and the bottom-tab change must preserve current Home, Create, and Profile behavior.

## 10) Open Questions

| Question | Proposed Default |
|---|---|
| Which storage provider should host public media? | Run a Phase 7e spike before enabling uploads; do not introduce storage dependency blindly. |
| Should public routes use handles or IDs? | Use handles for user-facing routes and retain user IDs internally for stable queries. |
| Should Search be visible to signed-out users? | Start signed-in only to reduce abuse and simplify launch; revisit public web/search later. |
| What fields are required to publish? | Artist name, handle, at least one avatar or hero fallback, and explicit publish confirmation. |
| Are venues/promoters separate account roles? | Not in first slice; everyone can search, artist accounts can publish. |
| What moderation is required before public media? | Add report hooks and owner takedown/unpublish first; defer full admin console until volume requires it. |
