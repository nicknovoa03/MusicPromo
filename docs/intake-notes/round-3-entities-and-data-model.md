# Round 3: Entities and Data Model — CONFIRMED

## Entity Map

| Entity | Storage | Owner | Visibility | Notes |
|---|---|---|---|---|
| **User Profile** | Convex | Self | Private | Extends Clerk data — name, preferences, subscription tier, profile info. Exact fields TBD. |
| **Project** | Convex (metadata) + Device (files) | User | Private | Saveable — user can return, re-export, tweak. Stores references to local files + settings used. |
| **Template / Style** | Convex (or config) | System | Public | v1 uses a curated set (`simple-spin`, `graphic-pop`) while keeping the model extensible for future expansion (AI-generated, etc.). |
| **Settings / Preferences** | On User Profile | User | Private | Default aspect ratio, default video length. CD spin speed hardcoded v1 (variable later). |
| **Push Token** | Convex | User | Private | Expo push token per device, linked to user. For push notifications via expo-notifications. |
| **Notification** | Convex | System/Admin | Per-user | Tracks sent notifications. Supports automated (event/time-based) and manual (admin-triggered). |

## Entity Details

### User Profile
- Linked to Clerk identity
- Key fields: `clerkId`, `name`, `email`, `avatarUrl`, `subscriptionTier`, `preferences`, `createdAt`
- Permissions: user can read/update own profile only

### Project
- Key fields: `userId`, `title` (optional), `templateId`, `aspectRatio`, `videoLength`, `photoUri` (local device path), `audioUri` (local device path), `exportedVideoUri` (local device path), `status` (draft/exported), `createdAt`, `updatedAt`
- Permissions: user can CRUD own projects only
- Files stay on-device — Convex stores metadata + local file references
- Typical queries: "list my projects sorted by recent," "get project by ID"

### Template
- Key fields: `id`, `name`, `description`, `previewImageUrl`, `type` (e.g., "spinning-cd"), `config` (speed, animation params)
- v1: curated entries — `simple-spin`, `graphic-pop`
- Future: AI-generated templates (Sora, Nano Banana, etc.)
- Permissions: read-only for users, admin-managed

### Settings (on User Profile)
- Fields: `defaultAspectRatio` (9:16 or 1:1), `defaultVideoLength` (15-60s)

### Push Token
- Key fields: `userId`, `expoPushToken`, `platform` (ios/android), `createdAt`, `updatedAt`
- One token per device; user may have multiple devices
- Permissions: system read, user's own device writes

### Notification
- Key fields: `id`, `userId`, `type` (reminder/new-template/export-complete/announcement), `title`, `body`, `read`, `trigger` (automated/manual), `sentAt`
- Permissions: user reads own, system/admin writes

## Notification Types (v1)

| Type | Trigger | Example |
|---|---|---|
| **Reminder** | Automated (time-based) | "You haven't made a promo in a while!" |
| **New template** | Automated (event-based) | "New video style available!" |
| **Export complete** | Automated (event-based) | "Your video is ready!" |
| **Marketing / Announcement** | Manual (admin-triggered) | Custom announcements |

Notification delivery: Expo Push Notifications (handles APNs + FCM).

## Sharing Integration

| Platform | Method | Behavior |
|---|---|---|
| **Instagram** | Native share intent (Expo Sharing) | Opens Instagram → user picks Story/Post/Reel in Instagram's own UI |
| **TikTok** | Native share intent (Expo Sharing) | Opens TikTok → user posts via TikTok's own UI |

No custom share UI needed on our side — we fire the intent with the video file and the target app handles the rest.

## Data Flow (Core Loop)

```
User signs in (Clerk)
  → Convex creates/fetches User Profile
  → Expo registers push token → stored in Convex
  → User picks photo from device (stays on device)
  → User picks audio from device (stays on device)
  → User picks template (Spinning CD), aspect ratio, length
  → Phone renders video locally
  → Metadata saved to Convex as a Project
  → User downloads to camera roll OR shares via native intent to Instagram/TikTok
  → PostHog tracks: video_exported, share_tapped, etc.
```

## What's NOT an Entity (v1)

- **Analytics events** — handled entirely by PostHog (no Convex storage)
- **Social features** — none for v1
- **Comments / Reactions** — none

## Assumptions (Round 3)

| # | Assumption | Impact if Wrong |
|---|---|---|
| A10 | Project metadata in Convex + files on-device only | If user switches phones, project history shows but files are gone. Acceptable for POC. |
| A11 | Share uses native OS share intents (not platform API integration) | Standard mobile behavior — Instagram/TikTok take over with their own UI. |
| A12 | User Profile exact fields beyond basics are TBD | Need to finalize before implementation, but won't block architecture. |
| A13 | Small curated template set for v1, data model supports many more | Keeps v1 scope tight while preserving expansion path. |
| A14 | Expo Push Notifications sufficient for all notification needs | May need Convex scheduled functions for time-based automated notifications. |
| A15 | No admin panel for v1 — manual notifications sent via Convex dashboard or script | If needed frequently, an admin UI becomes a priority. |
